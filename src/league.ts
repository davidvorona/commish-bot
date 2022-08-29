import { SlashCommandBuilder } from "discord.js";
import YahooFantasy from "yahoo-fantasy";
import { AnyObject } from "./types";

export default class League {
    id: string;

    key: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yf: any;

    name?: string;

    draft_status?: string;

    num_teams?: number;

    draft_time?: Date;

    draft_type?: string;

    draft_pick_time?: number;

    current_week?: number;

    start_date?: Date;

    end_date?: Date;

    teams?: AnyObject[];

    scoreboard?: AnyObject;

    constructor(leagueId: string, yfId: string, yfSecret: string) {
        this.yf = new YahooFantasy(
            yfId, // Yahoo! application client ID
            yfSecret // Yahoo! application client secret
        );

        this.id = leagueId;
        this.key = `nfl.l.${this.id}`;
    }

    async load() {
        let results = await this.yf.league.settings(this.key);

        this.name = results.name;

        // Set league start/end date
        this.start_date = new Date(results.start_date);
        this.end_date = new Date(results.end_date);

        this.draft_status = results.draft_status;
        this.num_teams = results.num_teams;
        this.draft_time = new Date(Number(results.settings.draft_time) * 1000);
        this.draft_type = results.settings.draft_type;
        this.draft_pick_time = Number(results.settings.draft_pick_time * 1000);

        this.current_week = results.current_week;
        
        // Set teams
        results = await this.yf.league.teams(this.key);
        this.teams = results.teams;

        // Set scoreboard: current week + matchups
        results = await this.yf.league.scoreboard(this.key);
        this.scoreboard = results.scoreboard;
    }

    async refresh() {
        await this.load();
    }

    buildClaimCommand() {
        const teamNamesMap = this.getTeamNamesMap();
        const choices = Object.keys(teamNamesMap).map(
            teamId => ({ name: teamNamesMap[teamId], value: teamId })
        );
        return new SlashCommandBuilder()
            .setName("claim")
            .setDescription("Claim a team")
            .addStringOption((option) => {
                return option
                    .setName("team")
                    .setRequired(true)
                    .setDescription("Choose a team")
                    .addChoices(...choices);
            });
    }

    async nextWeek() {
        const results = await this.yf.league.meta(this.key);

        if (this.current_week === results.current_week) {
            throw new Error("Already incremented week, aborting");
        }
        this.current_week = results.current_week;

        // Refresh the data
        await this.refresh();

        return this.current_week;
    }

    getName() {
        if (!this.name) {
            return "N/A";
        }
        return this.name;
    }

    getCurrentWeek() {
        return this.current_week;
    }

    getDraftStatus() {
        return this.draft_status;
    }

    getDraftTime() {
        return this.draft_time;
    }

    getHumanReadableDraftDate() {
        return this.draft_time?.toLocaleDateString();
    }

    getHumanReadableDraftTime() {
        return this.draft_time?.toLocaleTimeString();
    }

    getDraftType() {
        if (!this.draft_type) {
            return "N/A";
        }
        return this.draft_type.charAt(0).toUpperCase()
            + this.draft_type.toString().slice(1);
    }

    getHumanReadableDraftPickTime() {
        if (!this.draft_pick_time) {
            return "N/A";
        }
        return (this.draft_pick_time / 1000) + " seconds";
    }

    getTeams() {
        return this.teams;
    }

    getNumTeams() {
        if (!this.num_teams) {
            return "N/A";
        }
        return this.num_teams.toString();
    }

    getTeamNamesMap() {
        const result: Record<string, string> = {};
        this.teams?.forEach((t) => {
            result[t.team_id] = t.name;
        });
        return result;
    }
}
