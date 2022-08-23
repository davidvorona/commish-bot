import path from "path";
import { EmbedBuilder } from "discord.js";
import { parseJson, readFile } from "./util";
import { YahooJson } from "./types";
import League from "./league";
const yahooPath = path.join(__dirname, "../config/yahoo.json");
const {
    LEAGUE_ID
} = parseJson(readFile(yahooPath)) as YahooJson;

export default {
    draft: (league: League) => {
        const draftTime = league.getHumanReadableDraftDate() + " at " + league.getHumanReadableDraftTime();
        return new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle("Draft Info (/draft)")
            .setURL(`https://football.fantasysports.yahoo.com/f1/${LEAGUE_ID}/draft`)
            .setDescription(league.getName())
            .addFields(
                { name: ":date: Draft time", value: draftTime },
                { name: ":clipboard: Draft type", value: league.getDraftType(), inline: true },
                { name: ":timer: Draft pick time", value: league.getHumanReadableDraftPickTime(), inline: true },
                { name: ":football: Number of teams", value: league.getNumTeams(), inline: true }
            )
            .setTimestamp();
    },
    team: (league: League, teamId: string) => {
        const team = league.getTeams()?.find(t => t.team_id === teamId);
        const draftGrade = team?.has_draft_grade ? team?.draft_grade : "N/A";
        return new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle("Team Info (/team)")
            .setURL(team?.url)
            .addFields(
                { name: "Team name", value: team?.name },
                { name: "Draft grade", value: draftGrade },
                { name: "Number of trades", value: team?.number_of_trades.toString() }

            )
            .setImage(team?.team_logos[0].url)
            .setTimestamp();
    },
    help: () => {
        return new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle("List of Commands (/help)")
            .addFields(
                { name: "/draft", value: "Get league draft info" },
                { name: "/team", value: "Get your team info" },
                { name: "/constitution", value: "Get a link to the league constitution" },
                { name: "/punishments", value: "Get a link to the current punishments document" }
            )
            .setTimestamp();
    }
};
