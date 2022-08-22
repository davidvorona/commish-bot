import path from "path";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { Client, Guild, GatewayIntentBits, TextChannel } from "discord.js";
import { parseJson, readFile } from "./util";
import { ConfigJson, AuthJson, YahooJson } from "./types";
import League from "./league";
import WeekTicker from "./week-ticker";
import embeds from "./embeds";

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

const rest = new REST({ version: "9" }).setToken(TOKEN);

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const league = new League(LEAGUE_ID, YAHOO_CLIENT_ID, CLIENT_SECRET);

const setGuildCommands = async (guildId: string) => {
    try {
        console.log(`Refreshing application (/) commands for guild ${guildId}`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: defaultCommands }
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

            const cronTime = process.env.DEV_MODE
                ? "* * * * *"   // Every minute
                : "0 9 * * 2"; // Every Tuesday at 9am
            
            const weekTicker = new WeekTicker(cronTime, league, mainChannel);
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
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply("pong!");
    }

    if (!interaction.guildId) return;

    if (interaction.commandName === "ftc") {
        await interaction.reply("Fuck the commish!");
    }

    if (interaction.commandName === "draft") {
        await league.refresh();
        await interaction.reply({
            embeds: [embeds.draft(league)]
        });
    }
});

client.login(TOKEN);
