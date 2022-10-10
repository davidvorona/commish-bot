import path from "path";
import { SlashCommandBuilder, TextChannel } from "discord.js";
import { AnyObject, ConfigJson } from "./types";
import { readJson } from "./util";
import Storage from "./storage";
const {
    PUNISHMENT_SUBMISSIONS_URL,
    PUNISHMENTS_POLL_URL,
    PUNISHMENT_VETOES_URL
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

    storage: Storage;

    constructor(
        storage: Storage,
        channel: TextChannel
    ) {
        this.storage = storage;

        const state = storage.read() as AnyObject;
        this.memberSteps = state.memberSteps || {};
        this.leagueSteps = state.leagueSteps || [];

        this.channel = channel;
    }

    buildCommand() {
        return new SlashCommandBuilder()
            .setName("onboard")
            .setDescription("Complete an onboarding step")
            .setDefaultMemberPermissions(0)
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
        this.storage.add("leagueSteps", this.leagueSteps);

    }

    completeMemberStep(userId: string, step: MemberOnboardingStep) {
        if (!this.memberSteps[userId]) {
            this.memberSteps[userId] = [];
        }
        this.memberSteps[userId].push(step);
        this.storage.add("memberSteps", this.memberSteps);
    }

    async remind() {
        try {
            // Send out generic reminders
            const punishmentsNotSubmitted = this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsSubmitted) === -1;
            const usersNotChoose = Object.keys(this.memberSteps)
                .filter(userId => this.memberSteps[userId].indexOf(MemberOnboardingStep.PunishmentsChosen) === -1);
            const punishmentsNotChosen = this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsPolled) === -1 && usersNotChoose.length;
            if (punishmentsNotSubmitted) {
                await this.channel.send(`Don't forget to submit your punishments:\n${PUNISHMENT_SUBMISSIONS_URL}`);
            } else if (punishmentsNotChosen) {
                await this.channel.send(`Don't forget to complete the punishments poll!\n${PUNISHMENTS_POLL_URL}`);
            } else if (this.leagueSteps.indexOf(LeagueOnboardingStep.PunishmentsVetoed) === -1) {
                await this.channel.send(`Don't forget to veto a single punishment of your choice:\n${PUNISHMENT_VETOES_URL}`);
            }

            const members = this.channel.members.filter(m => !m.user.bot);
            // Compile individual reminders
            const reminders: Record<string, string[]> = {};
            members.filter(m => !m.user.bot).forEach((m) => {
                reminders[m.user.id] = [];
            });
            // Find users that still need to complete the punishments poll
            if (!punishmentsNotSubmitted && punishmentsNotChosen) {
                usersNotChoose.forEach((userId) => {
                    reminders[userId].push(MemberOnboardingStep.PunishmentsChosen);
                });
            }
            // Find users that still need to pay
            const paidMembers: string[] = Object.keys(this.memberSteps)
                .filter(userId => this.memberSteps[userId].indexOf(MemberOnboardingStep.Paid) > -1);
            const unpaidMembers = members.filter(m => paidMembers.indexOf(m.user.id) === -1);
            unpaidMembers.forEach((member) => {
                reminders[member.user.id].push(MemberOnboardingStep.Paid);
            });
            // Send out individual reminders
            Object.keys(reminders).forEach(async (userId) => {
                const member = members.find(m => m.user.id === userId);
                const userReminders = reminders[userId];
                if (userReminders.length) {
                    await member?.send("Hey gunner, stop being a fuckhead and do your duty. You must:"
                    + `${userReminders.indexOf(MemberOnboardingStep.Paid) > -1 ? "\n- Pay your buy-in ($50) to the commish.": ""}`
                    + `${userReminders.indexOf(MemberOnboardingStep.PunishmentsChosen) > -1 ? "\n- Submit your response to the punishments poll." : ""}`);
                }
            });
        } catch (err) {
            console.error(err);
        }
    }

    toObject() {
        return {
            memberSteps: this.memberSteps,
            leagueSteps: this.leagueSteps
        };
    }
}
