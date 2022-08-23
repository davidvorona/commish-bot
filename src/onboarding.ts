import path from "path";
import { TextChannel } from "discord.js";
import { AnyObject, LinksJson } from "./types";
import { parseJson, readFile } from "./util";
import { CronJob } from "cron";
const linksPath = path.join(__dirname, "../config/links.json");
const { PUNISHMENT_SUBMISSIONS, PUNISHMENTS_POLL } = parseJson(readFile(linksPath)) as LinksJson;

export enum MemberOnboardingStep {
    Paid = "Paid",
    PunishmentsChosen = "PunishmentsChosen",
    PunishmentVetoed = "PunishmentVetoed"
}

export enum LeagueOnboardingStep {
    PunishmentsSubmitted = "PunishmentsSubmitted",
    PunishmentsPolled = "PunishmentsPolled",
    PunishmentsVetoed = "PunishmentsVetoed"
}

export default class Onboarding {
    memberSteps: Record<string, MemberOnboardingStep[]>;

    leagueSteps: LeagueOnboardingStep[];

    channel: TextChannel;

    ticker: CronJob;

    constructor(cronTime: string, state: AnyObject, channel: TextChannel) {
        this.memberSteps = state.memberSteps || {};
        this.leagueSteps = state.leagueSteps || [];

        this.channel = channel;
        this.ticker = new CronJob(cronTime, () => this.remind());
    }

    start() {
        this.ticker.start();
    }

    completeLeagueStep(step: LeagueOnboardingStep) {
        this.leagueSteps.push(step);
    }

    completeMemberStep(userId: string, step: MemberOnboardingStep) {
        if (!this.memberSteps[userId]) {
            this.memberSteps[userId] = [];
        }
        this.memberSteps[userId].push(step);
    }

    async remind() {
        if (this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsSubmitted) === -1) {
            await this.channel.send(`Don't forget to submit your punishments:\n${PUNISHMENT_SUBMISSIONS}`);
        } else if (this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsPolled) === -1) {
            await this.channel.send(`Don't forget to complete the punishments poll!\n${PUNISHMENTS_POLL}`);
        } else if (this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsVetoed) === -1) {
            await this.channel.send(`Don't forget to veto a single punishment of your choice:\n${PUNISHMENT_SUBMISSIONS}`);
        }
    }
}
