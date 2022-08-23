import path from "path";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, Guild, GatewayIntentBits, TextChannel, SlashCommandBuilder, GuildMember } from "discord.js";
import { parseJson, readFile } from "./util";
import { ConfigJson, AuthJson, YahooJson, LinksJson, AnyObject } from "./types";
import League from "./league";
import WeekTicker from "./week-ticker";
import embeds from "./embeds";
import Storage from "./storage";
import Onboarding, { LeagueOnboardingStep, MemberOnboardingStep } from "./onboarding";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultCommands = require("../config/commands");

const authPath = path.join(__dirname, "../config/auth.json");
const { TOKEN } = parseJson(readFile(authPath)) as AuthJson;
const configPath = path.join(__dirname, "../config/config.json");
const { CLIENT_ID, GUILD_ID, TEST_CHANNEL_ID } = parseJson(readFile(configPath)) as ConfigJson;
const yahooPath = path.join(__dirname, "../config/yahoo.json");
const {
    CLIENT_ID: YAHOO_CLIENT_ID,
    CLIENT_SECRET,
    LEAGUE_ID
} = parseJson(readFile(yahooPath)) as YahooJson;
const linksPath = path.join(__dirname, "../config/links.json");
const { PUNISHMENT_SUBMISSIONS, CONSTITUTION } = parseJson(readFile(linksPath)) as LinksJson;

const rest = new REST({ version: "9" }).setToken(TOKEN);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const ownersStorage = new Storage("owners.json");
const onboardingStorage = new Storage("onboarding.json");

const league = new League(LEAGUE_ID, YAHOO_CLIENT_ID, CLIENT_SECRET);
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

            await league.load();
            console.info("Loaded league:", league);

            const cronTimeOnboarding = process.env.DEV_MODE
                ? "* * * * *"   // Every minute
                : "0 10,22 * * *"; // Every day at 10am and 10pm
            const onboardingState = onboardingStorage.read() as AnyObject;
            onboarding = new Onboarding(cronTimeOnboarding, onboardingState, mainChannel);
            onboarding.start();

            // map: id => name
            const teamNamesMap = league.getTeamNamesMap();
            const choices = Object.keys(teamNamesMap).map(
                teamId => ({ name: teamNamesMap[teamId], value: teamId })
            );
            const command = new SlashCommandBuilder()
                .setName("claim")
                .setDescription("Claim a team")
                .addStringOption((option) => {
                    return option
                        .setName("team")
                        .setRequired(true)
                        .setDescription("Choose a team")
                        .addChoices(...choices);
                });
            await setGuildCommands(guild.id, [command]);

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
        await interaction.reply(`**Major League Shotgunners Constitution**\n${CONSTITUTION}`);
    }

    if (interaction.commandName === "punishments") {
        await interaction.reply(`**Major League Shotgunners Punishments**\n${PUNISHMENT_SUBMISSIONS}`);
    }

    if (interaction.commandName === "onboard") {
        const leagueStep = interaction.options.getString("league_step");
        const memberStep = interaction.options.getString("member_step");
        const userMention = interaction.options.getMentionable("member") as GuildMember;
        if (!!leagueStep == !!memberStep) {
            await interaction.reply("You must choose either a league or member onboarding step.");
            return;
        }
        if (!!memberStep != !!userMention) {
            await interaction.reply("You must choose a specific user and the completed step.");
            return;
        }
        if (memberStep && userMention) {
            const step = memberStep as MemberOnboardingStep;
            onboarding.completeMemberStep(userMention.user.id, step);
        } else if (leagueStep) {
            const step = leagueStep as LeagueOnboardingStep;
            onboarding.completeLeagueStep(step);
        }
        await interaction.reply("Step completed!");
    }
});

client.login(TOKEN);
