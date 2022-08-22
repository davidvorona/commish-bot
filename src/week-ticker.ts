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
        const draftStatus = this.league.getDraftStatus();
        try {
            if (draftStatus === DRAFT_STATUS.PREDRAFT) {
                this.handlePredraft();
            } else if (draftStatus === DRAFT_STATUS.POSTDRAFT) {
                this.handleNewWeek();
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

    handlePredraft() {
        const draftEmbed = embeds.draft(this.league);
        this.channel.send({
            content: `**Attention, ${this.league.getName()}!** It's Tuesday, which means we're starting up another`
                + " week of fantasy football! This league is currently **predraft**, which means no shotguns"
                + " are currently due. Get those draft strats finalized and those gullets ready!\n*Use **/draft**"
                + " to see draft info.*",
            embeds: [draftEmbed]
        });
    }

    async handleNewWeek() {
        const newWeek = await this.league.nextWeek();
        this.channel.send(`Welcome to **Week ${newWeek}**! As always, there are winners and losers.`);
    }
}