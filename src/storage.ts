import path from "path";
import fs from "fs";
import { ConfigJson, AnyObject } from "./types";
import { readJson, parseJson } from "./util";
const { DATA_DIR } = readJson(path.join(__dirname, "../config/config.json")) as ConfigJson;

type AnyValue = AnyObject | string | number;

class Storage {
    static validateDataDir(path: string) {
        const exists = fs.existsSync(path);
        if (!exists) {
            console.error("Cannot start bot without data directory, aborting");
            throw new Error("No data directory");
        }
    }

    dataDir: string = DATA_DIR;

    filePath: string;

    constructor(fileName: string, overridePath?: boolean) {
        this.filePath = overridePath ? fileName : `${this.dataDir}/${fileName}`;
        const fileExists = fs.existsSync(this.filePath);
        if (!fileExists) {
            fs.openSync(this.filePath, "a");
            console.info(`File ${this.filePath} created`);
        }
    }

    read(): Record<string, AnyValue> {
        let data;
        try {
            const dataStr = fs.readFileSync(this.filePath, "utf-8");
            data = parseJson(dataStr);
            console.info(`${this.filePath} loaded`);
        } catch (err) {
            console.error(err);
            data = [];
        }
        return data;
    }

    write(data: Record<string, AnyValue>) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data));
            console.info(`${this.filePath} written`);
        } catch(err) {
            console.error(err);
        }
    }

    add(key: string, value: AnyValue) {
        const data = this.read();
        data[key] = value;
        this.write(data);
    }

    delete(key: string) {
        const data = this.read();
        delete data[key];
        this.write(data);
    }
}

export default Storage;
