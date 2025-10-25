import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import DataLoader from "dataloader";

export type User = {
    nickname: string;
}

// Hashmap to cache user info
const userCache: Record<string, Promise<User>> = {};

function getUsers(uid: readonly string[]): PromiseLike<ArrayLike<User>> {
    const getUserInfo = httpsCallable(functions, "getUserInfo");
    const missingUids = uid.filter((id) => !userCache[id]);
    if (missingUids.length > 0) {
        const promise = getUserInfo({ uid: missingUids });
        missingUids.forEach((id, index) => {
            userCache[id] = promise.then((res) => (res.data as any[])[index]);
        });
    }
    return Promise.all(uid.map((id) => userCache[id]));
}


const userLoader = new DataLoader((keys: readonly string[]): PromiseLike<ArrayLike<User>> => getUsers(keys));

export { userLoader };
