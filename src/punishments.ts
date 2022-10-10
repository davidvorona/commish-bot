import { TextChannel } from "discord.js";
import path from "path";
import { readJson } from "./util";
import Storage from "./storage";

const PUNISHMENT_LIST = readJson(path.join(__dirname, "../config/punishments.json")) as string[];

interface Punishment {
    id: number;
    option: boolean;
    picked: boolean;
}

export default class PunishmentManager {
    storage: Storage;

    punishments: Record<number, Punishment>;

    channel: TextChannel;

    constructor(punishments: Storage, channel: TextChannel) {
        this.storage = punishments;
        this.channel = channel;
        this.punishments = punishments.read() as Record<number, Punishment>;
    }

    pick() {
        console.log("Pick punishment or sumthin idk");
    }

    remind() {
        console.log("Remind to do sum shit ya feel");
    }
}
