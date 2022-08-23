// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ApplicationCommandOptionType } = require("discord-api-types/v9");

module.exports = [
    {
        name: "ping",
        description: "Replies with pong!"
    },
    {
        name: "ftc",
        description: "Fuck the commish!"
    },
    {
        name: "draft",
        description: "Get draft info"
    },
    {
        name: "team",
        description: "Get team info"
    },
    {
        name: "constitution",
        description: "Get a link to the league constitution"
    },
    {
        name: "punishments",
        description: "Get a link to the current punishment document"
    },
    {
        name: "onboard",
        description: "Complete a league or member onboarding step",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "league_step",
                description: "Complete a league-wide onboarding step",
                choices: [
                    { name: "Punishments Submitted", value: "PunishmentsSubmitted" },
                    { name: "Punishments Polled", value: "PunishmentsPolled" },
                    { name: "Punishments Vetoed", value: "PunishmentsVetoed" }
                ]
            },
            {
                type: ApplicationCommandOptionType.Mentionable,
                name: "member",
                description: "Choose the member completing an onboarding step"
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "member_step",
                description: "Complete an onboarding step for a member",
                choices: [
                    { name: "Paid", value: "Paid" },
                    { name: "Punishments Chosen", value: "PunishmentsChosen" },
                    { name: "Punishment Vetoed", value: "PunishmentVetoed" }
                ]
            }
        ]
    }
];
