export const DRAFT_STATUS = {
    PREDRAFT: "predraft",
    POSTDRAFT: "postdraft"
} as const;

export const POSTDRAFT_STATE = {
    NEW_WEEK: "new_week",
    PUNISHMENT_PICKED: "punishment_picked",
    PUNISHMENT_COMPLETE: "punishment_complete"
} as const;

export const STATE = {
    [DRAFT_STATUS.PREDRAFT]: [],
    [DRAFT_STATUS.POSTDRAFT]: [
        POSTDRAFT_STATE.NEW_WEEK,
        POSTDRAFT_STATE.PUNISHMENT_PICKED,
        POSTDRAFT_STATE.PUNISHMENT_COMPLETE
    ]
} as const;

export const PUNISHMENT_TYPE = {
    SHOTGUN: "shotgun",
    WEEK_BIGGEST_LOSER: "week_biggest_loser",
    SEASON_BIGGEST_LOSER: "season_biggest_loser"
} as const;

export const CRON_TIME = {
    DEBUG: "* * * * *",                         // Every minute
    ONBOARDING: "0 10,22 * * *",                // Every day at 10am and 10pm
    NEW_WEEK: "0 9 * * 2",                      // Every Tuesday at 9am
    PUNISHMENT_PICKER: "0 9 * * 3",             // Every Wednesday at 9am
    PUNISHMENT_REMIND: "0 9 * * 0,1,3,4,5,6"    // Every day except Tuesday at 9am
} as const;
