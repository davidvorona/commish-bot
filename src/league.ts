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

    scoreboards?: AnyObject[];

    constructor(leagueId: string, yfId: string, yfSecret: string) {
        this.yf = new YahooFantasy(
            yfId, // Yahoo! application client ID
            yfSecret // Yahoo! application client secret
        );

        this.id = leagueId;
        this.key = `nfl.l.${this.id}`;
    }

    async fetchScoreboards(week: number) {
        const scoreboards = await Promise.all(new Array(week).fill(0).map(async (x, idx) => {
            const result = await this.yf.league.scoreboard(this.key, idx + 1);
            return {
                matchups: result.scoreboard.matchups,
                week: Number(result.scoreboard.week)
            };
        }));
        return scoreboards;
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

        // Set scoreboards: current and previous week matchups
        this.scoreboards = results.scoreboard;
        if (this.current_week && this.current_week > 1) {
            this.scoreboards = await this.fetchScoreboards(this.current_week);
        }
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

    getPreviousWeekWinners() {
        const previousWeek = this.current_week as number - 1;
        const scoreboard = this.scoreboards?.find(s => s.week === previousWeek);
        if (!scoreboard) {
            throw new Error("Invalid week, no scoreboard found");
        }
        const teams = scoreboard.matchups
            .map((m: AnyObject) => m.teams.find((t: AnyObject) => t.team_key === m.winner_team_key));
        return teams.map((t: AnyObject) => t.team_id);
    }

    getPreviousWeekLosers() {
        const previousWeek = this.current_week as number - 1;
        const scoreboard = this.scoreboards?.find(s => s.week === previousWeek);
        if (!scoreboard) {
            throw new Error("Invalid week, no scoreboard found");
        }
        const teams = scoreboard.matchups
            .map((m: AnyObject) => m.teams.find((t: AnyObject) => t.team_key !== m.winner_team_key));
        return teams.map((t: AnyObject) => t.team_id);
    }

    getPreviousWeekBiggestLoser() {
        const previousWeek = this.current_week as number - 1;
        const scoreboard = this.scoreboards?.find(s => s.week === previousWeek);
        if (!scoreboard) {
            throw new Error("Invalid week, no scoreboard found");
        }
        const teams = scoreboard.matchups
            .map((m: AnyObject) => m.teams.find((t: AnyObject) => t.team_key !== m.winner_team_key));
        let biggestLoser = teams[0];
        for (let i = 1; i < teams.length; i++) {
            if (Number(teams[i].points.total) < Number(biggestLoser.points.total)) {
                biggestLoser = teams[i];
            }
        }
        return biggestLoser.team_id;
    }
}
