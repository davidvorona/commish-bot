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
            .setTitle("Draft Info")
            .setURL(`https://football.fantasysports.yahoo.com/f1/${LEAGUE_ID}/draft`)
            .setDescription(league.getName())
            .addFields(
                { name: ":date: Draft time", value: draftTime },
                { name: ":clipboard: Draft type", value: league.getDraftType(), inline: true },
                { name: ":timer: Draft pick time", value: league.getHumanReadableDraftPickTime(), inline: true },
                { name: ":football: Number of teams", value: league.getNumTeams(), inline: true }
            )
            .setTimestamp();
    }
};
