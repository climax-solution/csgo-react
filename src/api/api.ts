import * as I from './interfaces';
import queryString from 'query-string';


const query = queryString.parseUrl(window.location.href).query;
export const port = (query && Number(query.port)) || 1349;

export const isDev = !query.isProd;

export const config = {apiAddress:isDev ? `http://localhost:${port}/` : '/'}
export const apiUrl = config.apiAddress;

export async function apiV2(url: string, method = 'GET', body?: any) {
    const options: RequestInit = {
        method,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    }
    if (body) {
        options.body = JSON.stringify(body)
    }
    let data: any = null;
    return fetch(`${apiUrl}api/${url}`, options)
        .then(res => {
            data = res;
            return res.json().catch(_e => data && data.status < 300)
        });
}

export default {
    match: {
        get: async (): Promise<I.Match[]> => apiV2(`match`)
    },
    teams: {
        getOne: async (id: string): Promise<I.Team> => apiV2(`teams/${id}`)
    },
    players: {
        get: async (): Promise<I.Player[]> => apiV2(`players`),
        getAvatarURLs: async (steamid: string): Promise<{custom: string, steam: string}> => apiV2(`players/avatar/steamid/${steamid}`)
    }
}