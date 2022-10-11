import { CronJob } from "cron";
import path from "path";
import { Guild, GuildMember, TextChannel } from "discord.js";
import Storage from "./storage";
import League from "./league";
import embeds from "./embeds";
import { DRAFT_STATUS, CRON_TIME } from "./constants";
import Onboarding from "./onboarding";
import PunishmentManager from "./punishments";
import { AnyObject, ConfigJson } from "./types";
import { getCronTime, readJson } from "./util";

const {
    SHOTGUN_CHANNEL_ID,
    PUNISHMENTS_CHANNEL_ID,
    TEST_CHANNEL_ID
} = readJson(path.join(__dirname, "../config/config.json")) as ConfigJson;

const onboardingStorage = new Storage("onboarding.json");
const punishmentsStorage = new Storage("punishments.json");

export default class Commissioner {
    guild: Guild;

    channel: TextChannel;

    ownersStorage: Storage;

    owners: Record<string, string>;

    league: League;

    commands: AnyObject[] = [];

    punishments: PunishmentManager;

    onboarding: Onboarding;

    newWeekTicker: CronJob;

    onboardingTicker: CronJob;

    punishmentPickerTicker: CronJob;

    punishmentRemindTicker: CronJob;

    constructor(league: League, ownersStorage: Storage, guild: Guild) {
        this.guild = guild;

        // Get the main channel for bot messages
        const mainChannel = process.env.DEV_MODE
            ? guild.channels.cache.find(c => c.id === TEST_CHANNEL_ID)
            : guild.systemChannel;
        if (!mainChannel || !(mainChannel instanceof TextChannel)) {
            throw new Error("Unable to establish main channel");
        }
        this.channel = mainChannel as TextChannel;

        this.ownersStorage = ownersStorage;
        this.owners = ownersStorage.read() as Record<string, string>;

        this.league = league;
        this.commands.push(this.league.buildClaimCommand());

        // Start the main ticker, which transitions to a new week every Tuesday
        // Commissioner handles this logic itself via the tick() method
        this.newWeekTicker = new CronJob(getCronTime(CRON_TIME.NEW_WEEK), () => this.tick());

        // Start the preseason onboarding process:
        // If onboarding is not complete by the time the draft is done,
        // then leave remaining onboarding up to the commissioner
        this.onboarding = new Onboarding(onboardingStorage, this.channel);
        this.commands.push(this.onboarding.buildCommand());
        console.info("Loaded onboarding", this.onboarding.toObject());
        this.onboardingTicker = new CronJob(getCronTime(CRON_TIME.ONBOARDING), () => this.onboarding.remind());

        // Load the punishment manager, which handles shotguns and biggest loser punishments
        this.punishments = new PunishmentManager(punishmentsStorage, this.channel);
        console.info("Loaded punishments", this.punishments);
        // Scheduled for every Tuesday, picks two punishments for biggest loser to choose
        this.punishmentPickerTicker = new CronJob(
            getCronTime(CRON_TIME.PUNISHMENT_PICKER),
            () => this.punishments.pick()
        );
        // Scheduled for every day but Tuesday, reminds all losers that they have punishments
        this.punishmentRemindTicker = new CronJob(
            getCronTime(CRON_TIME.PUNISHMENT_REMIND),
            () => this.punishments.remind()
        );
    }

    getOnboarding() {
        return this.onboarding;
    }

    getLeague() {
        return this.league;
    }

    getPunishments() {
        return this.punishments;
    }

    getCommands() {
        return this.commands;
    }

    start() {
        this.newWeekTicker.start();
        if (this.league.getDraftStatus() === DRAFT_STATUS.PREDRAFT) {
            console.info("In predraft: starting onboarding ticker");
            this.onboardingTicker.start();
        }
        this.punishmentPickerTicker.start();
        this.punishmentRemindTicker.start();
    }

    async tick() {
        const prevDraftStatus = this.league.getDraftStatus();
        // Refresh league data
        await this.league.refresh();
        // Reload owners
        this.owners = this.ownersStorage.read() as Record<string, string>;
        // Use draft status to determine how to handle new week
        const draftStatus = this.league.getDraftStatus();
        try {
            if (draftStatus === DRAFT_STATUS.PREDRAFT) {
                await this.handlePredraft();
            } else if (draftStatus === DRAFT_STATUS.POSTDRAFT) {
                if (prevDraftStatus === DRAFT_STATUS.PREDRAFT) {
                    this.onboardingTicker.stop();
                }
                await this.handleNewWeek();
            }
            console.info(
                `Week ${this.league.getCurrentWeek()}`,
                `(${draftStatus})`,
                "started at",
                new Date().toISOString()
            );
        } catch (err) {
            console.error(err);
        }
    }

    async handlePredraft() {
        const draftEmbed = embeds.draft(this.league);
        await this.channel.send({
            content: `**Attention, ${this.league.getName()}!** It's Tuesday, which means we're starting up another`
                + " week of fantasy football! This league is currently in **predraft**, so no shotguns"
                + " are currently due. Get those draft strats finalized and those gullets ready!\n*Use **/claim**"
                + " to claim a team.*",
            embeds: [draftEmbed]
        });
    }

    getUserByTeamId = (teamId: string) => {
        const userId = Object.keys(this.owners).find(userId => this.owners[userId] === teamId);
        return this.channel.members.find(m => m.user.id === userId);
    };

    async handleNewWeek() {
        if (!this.league.start_date) {
            throw new Error("No start date defined for league, aborting");
        }
        const startDate = this.league.start_date;
        const currentDate = new Date();
        const nextWeekDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        // If league isn't starting in the next week, just display draft results
        if (startDate >= nextWeekDate) {
            await this.channel.send("The draft is complete, and gullets are primed for gaping.");
        // If the league starts this week
        } else if (startDate <= nextWeekDate && startDate >= currentDate) {
            await this.channel.send("The season starts this week! Get those teams ready and those guns primed.");
        // If the league has started, it's a new week
        } else {
            // Announce new week
            const newWeek = await this.league.nextWeek() as number;
            await this.channel.send(`Welcome to **Week ${newWeek}**!`);
            // Get week's losers to mention who shotguns
            const losers = this.league.getPreviousWeekLosers().map(this.getUserByTeamId).filter((u: GuildMember) => !!u);
            const shotgunChannel = this.guild.channels.cache.get(SHOTGUN_CHANNEL_ID);
            await this.channel.send(`The following players lost in their **Week ${newWeek - 1}** matchup:`
                + ` ${losers.join(" ")}. Post a shotgun video to ${shotgunChannel} by Sunday at midnight!`);
            // Get week's biggest loser to mention who does punishment
            const biggestLoser = this.getUserByTeamId(this.league.getPreviousWeekBiggestLoser());
            const punishmentsChannel = this.guild.channels.cache.get(PUNISHMENTS_CHANNEL_ID);
            await this.channel.send(`Nice job, ${biggestLoser}! You lost *and* scored the least amount of points in **Week`
                + ` ${newWeek}**. You owe us proof of your punishment in ${punishmentsChannel} by Sunday at midnight!`);
        }
    }
}
