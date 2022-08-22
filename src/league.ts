import YahooFantasy from "yahoo-fantasy";
import { AnyObject } from "./types";

export default class League {
    id: string;

    key: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yf: any;

    draft_status?: string;

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
        let results = await this.yf.league.teams(this.key);

        // Set league start/end date
        this.start_date = new Date(results.start_date);
        this.end_date = new Date(results.end_date);

        this.draft_status = results.draft_status;

        this.current_week = results.current_week;
        
        // Set teams
        this.teams = results.teams;

        // Set scoreboard: current week + matchups
        results = await this.yf.league.scoreboard(this.key);
        this.scoreboard = results.scoreboard;
    }

    async refresh() {
        this.load();
    }

    async nextWeek() {
        const results = await this.yf.league.metadata(this.key);

        if (this.current_week === results.current_week) {
            throw new Error("Already incremented week, aborting");
        }
        this.current_week = results.current_week;

        // Refresh the data
        await this.refresh();

        return this.current_week;
    }

    async getCurrentWeek() {
        return this.current_week;
    }
}
