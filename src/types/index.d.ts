/* Structure of JSON file with bot token */
export interface AuthJson {
    TOKEN: string;
}

/* Structure of JSON file with bot config */
export interface ConfigJson {
    CLIENT_ID: string;
    GUILD_ID: string;
    DATA_DIR: string;
    TEST_CHANNEL_ID: string;
    YAHOO_CLIENT_ID: string;
    YAHOO_CLIENT_SECRET: string;
    YAHOO_APP_ID: string;
    YAHOO_FANTASY_LEAGUE_ID: string;
    PUNISHMENT_SUBMISSIONS_URL: string;
    PUNISHMENTS_POLL_URL: string;
    PUNISHMENT_VETOES_URL: string;
    CONSTITUTION_URL: string;
}

export interface AnyObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: string | number | any;
}
