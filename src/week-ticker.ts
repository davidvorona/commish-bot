import { CronJob } from "cron";
import { TextChannel } from "discord.js";
import League from "./league";

import embeds from "./embeds";

const DRAFT_STATUS = {
    PREDRAFT: "predraft",
    POSTDRAFT: "postdraft"
} as const;

export default class WeekTicker {
    channel: TextChannel;

    league: League;

    ticker: CronJob;

    constructor(cronTime: string, league: League, channel: TextChannel) {
        this.channel = channel;
        this.league = league;
        this.ticker = new CronJob(cronTime, () => this.tick());
    }

    start() {
        this.ticker.start();
    }

    async tick() {
        // Refresh league data
        await this.league.refresh();
        // Use draft status to determine how to handle new week
        const draftStatus = this.league.getDraftStatus();
        try {
            if (draftStatus === DRAFT_STATUS.PREDRAFT) {
                await this.handlePredraft();
            } else if (draftStatus === DRAFT_STATUS.POSTDRAFT) {
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
            await this.channel.send("The season starts this week! Get those guns ready.");
        // If the league has started, it's a new week
        } else {
            const newWeek = await this.league.nextWeek();
            await this.channel.send(`Welcome to **Week ${newWeek}**! As always, there are winners and losers.`);
        }
    }
}
