import path from "path";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, Guild, GatewayIntentBits, TextChannel, GuildMember } from "discord.js";
import { readJson } from "./util";
import { ConfigJson, AuthJson, AnyObject } from "./types";
import League from "./league";
import WeekTicker from "./week-ticker";
import embeds from "./embeds";
import Storage from "./storage";
import Onboarding, { LeagueOnboardingStep, MemberOnboardingStep } from "./onboarding";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultCommands = require("../config/commands");

const { TOKEN } = readJson(path.join(__dirname, "../config/auth.json")) as AuthJson;
const {
    CLIENT_ID,
    GUILD_ID,
    TEST_CHANNEL_ID,
    YAHOO_CLIENT_ID,
    YAHOO_CLIENT_SECRET,
    YAHOO_FANTASY_LEAGUE_ID,
    PUNISHMENT_SUBMISSIONS_URL,
    CONSTITUTION_URL
} = readJson(path.join(__dirname, "../config/config.json")) as ConfigJson;

const rest = new REST({ version: "9" }).setToken(TOKEN);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const ownersStorage = new Storage("owners.json");
const onboardingStorage = new Storage("onboarding.json");

let league: League;
let onboarding: Onboarding;

const setGuildCommands = async (guildId: string, builtCommands: AnyObject[] = []) => {
    try {
        console.log(`Refreshing application (/) commands for guild ${guildId}`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: [...defaultCommands, ...builtCommands] }
        );
    } catch (error) {
        console.error(error);
    }
};

client.on("ready", async () => {
    try {
        if (client.user) {
            console.info("Logged in as", client.user.tag);
            console.info("Dev mode:", process.env.DEV_MODE);
        }
        if (client.application) {
            console.info("Clearing any existing global application (/) commands");
            client.application.commands.set([]);

            const guild = client.guilds.cache.find(g => g.id === GUILD_ID);
            if (!guild) {
                throw new Error("There is no valid guild ID, aborting");
            }
            await setGuildCommands(guild.id);

            const mainChannel = process.env.DEV_MODE
                ? guild.channels.cache.find(c => c.id === TEST_CHANNEL_ID)
                : guild.systemChannel;
            
            if (!mainChannel || !(mainChannel instanceof TextChannel)) {
                throw new Error("Unable to establish main channel");
            }

            league = new League(YAHOO_FANTASY_LEAGUE_ID, YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET);
            await league.load();
            console.info("Loaded league:", league);

            // Start the preseason onboarding process
            // TODO: Maybe only in "predraft"?
            const cronTimeOnboarding = process.env.DEV_MODE
                ? "* * * * *"   // Every minute
                : "0 10,22 * * *"; // Every day at 10am and 10pm
            const onboardingState = onboardingStorage.read() as AnyObject;
            onboarding = new Onboarding(cronTimeOnboarding, onboardingState, mainChannel);
            onboarding.start();

            // Register dynamic commands
            const claimCommand = league.buildClaimCommand();
            const onboardingCommand = onboarding.buildCommand();
            await setGuildCommands(guild.id, [onboardingCommand, claimCommand]);

            // Start the week ticker for weekly updates
            const cronTimeWeek = process.env.DEV_MODE
                ? "* * * * *"   // Every minute
                : "0 9 * * 2"; // Every Tuesday at 9am
            const weekTicker = new WeekTicker(cronTimeWeek, league, mainChannel);
            weekTicker.start();
        }
    } catch (err) {
        console.error(err);
    }
});

client.on("guildCreate", async (guild: Guild) => {
    // Registers the default commands when the bot joins a guild
    await setGuildCommands(guild.id);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply("pong!");
    }

    if (interaction.commandName === "ftc") {
        await interaction.reply("Fuck the commish!");
    }

    if (interaction.commandName === "draft") {
        await league.refresh();
        await interaction.reply({
            embeds: [embeds.draft(league)]
        });
    }

    if (interaction.commandName === "claim") {
        const teamId = interaction.options.getString("team") as string;
        const teamNamesMap = league.getTeamNamesMap();
        ownersStorage.add(interaction.user.id, teamId);
        await interaction.reply(`${interaction.user} has claimed **${teamNamesMap[teamId]}**`);
    }

    if (interaction.commandName === "team") {
        const owners = ownersStorage.read();
        const teamId = owners[interaction.user.id] as string;
        if (!teamId) {
            await interaction.reply({
                content: "You do not own a team. Use **/claim** to claim one.",
                ephemeral: true
            });
            return;
        }

        const teamEmbed = embeds.team(league, teamId);
        await interaction.reply({ embeds: [teamEmbed], ephemeral: true });
    }

    if (interaction.commandName === "constitution") {
        await interaction.reply(`**Major League Shotgunners Constitution**\n${CONSTITUTION_URL}`);
    }

    if (interaction.commandName === "punishments") {
        await interaction.reply(`**Major League Shotgunners Punishments**\n${PUNISHMENT_SUBMISSIONS_URL}`);
    }

    if (interaction.commandName === "onboard") {
        const step = interaction.options.getString("step");
        if (interaction.options.getSubcommand() === "league") {
            onboarding.completeLeagueStep(step as LeagueOnboardingStep);
        } else if (interaction.options.getSubcommand() === "member") {
            const member = interaction.options.getMentionable("user") as GuildMember;
            onboarding.completeMemberStep(member.id, step as MemberOnboardingStep);
        }
        await interaction.reply({ content: "Step completed!", ephemeral: true });
    }

    if (interaction.commandName === "help") {
        const helpEmbed = embeds.help();
        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }
});

client.login(TOKEN);
