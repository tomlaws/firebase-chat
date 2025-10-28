import type { User } from 'firebase/auth';
import { createContext } from 'svelte';

export type UserContext = {
    user: () => User;
    claims: () => Record<string, any>;
}

export const [getUserContext, setUserContext] = createContext<UserContext>();