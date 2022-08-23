import path from "path";
import { SlashCommandBuilder, TextChannel } from "discord.js";
import { AnyObject, ConfigJson } from "./types";
import { readJson } from "./util";
import { CronJob } from "cron";
const {
    PUNISHMENT_SUBMISSIONS_URL,
    PUNISHMENTS_POLL_URL
} = readJson(path.join(__dirname, "../config/config.json")) as ConfigJson;
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

    buildCommand() {
        return new SlashCommandBuilder()
            .setName("onboard")
            .setDescription("Complete an onboarding step")
            .addSubcommand(subcommand =>
                subcommand
                    .setName("league")
                    .setDescription("Complete a league-wide onboarding step")
                    .addStringOption((option) => {
                        return option
                            .setName("step")
                            .setRequired(true)
                            .setDescription("Choose a step")
                            .addChoices(
                                { name: "Punishments Submitted", value: LeagueOnboardingStep.PunishmentsSubmitted },
                                { name: "Punishments Polled", value: LeagueOnboardingStep.PunishmentsPolled },
                                { name: "Punishments Vetoed", value: LeagueOnboardingStep.PunishmentsVetoed }
                            );
                    }))
            .addSubcommand(subcommand =>
                subcommand
                    .setName("member")
                    .setDescription("Complete an onboarding step for a member")
                    .addMentionableOption((option) => {
                        return option
                            .setName("user")
                            .setRequired(true)
                            .setDescription("Pick a user");
                    })
                    .addStringOption((option) => {
                        return option
                            .setName("step")
                            .setRequired(true)
                            .setDescription("Choose a step")
                            .addChoices(
                                { name: "Paid", value: MemberOnboardingStep.Paid },
                                { name: "Punishments Chosen", value: MemberOnboardingStep.PunishmentsChosen },
                                { name: "Punishment Vetoed", value: MemberOnboardingStep.PunishmentVetoed }
                            );
                    }));
                   
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
            await this.channel.send(`Don't forget to submit your punishments:\n${PUNISHMENT_SUBMISSIONS_URL}`);
        } else if (this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsPolled) === -1) {
            await this.channel.send(`Don't forget to complete the punishments poll!\n${PUNISHMENTS_POLL_URL}`);
        } else if (this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsVetoed) === -1) {
            await this.channel.send(`Don't forget to veto a single punishment of your choice:\n${PUNISHMENT_SUBMISSIONS_URL}`);
        }

        const unpaidMembers: string[] = Object.keys(this.memberSteps)
            .filter(userId => this.memberSteps[userId].indexOf(MemberOnboardingStep.Paid) > -1);
        console.log(unpaidMembers);
    }
}
