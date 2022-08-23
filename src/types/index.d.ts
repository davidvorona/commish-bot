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
}

export interface YahooJson {
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    APP_ID: string;
    LEAGUE_ID: string;
}

export interface LinksJson {
    PUNISHMENT_SUBMISSIONS: string;
    PUNISHMENTS_POLL: string;
    CONSTITUTION: string;
}

export interface AnyObject {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: string | number | any;
}
