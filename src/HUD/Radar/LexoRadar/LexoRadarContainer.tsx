import React from 'react';
import { Player, Bomb } from 'csgogsi-socket';
import maps from './maps';
import './index.css';
import LexoRadar from './LexoRadar';
import { ExtendedGrenade, Grenade, RadarPlayerObject, RadarGrenadeObject } from './interface';
import config from './config';

let playersStates: Player[][] = [];
let grenadesStates: ExtendedGrenade[][] = [];
const directions: { [key: string]: number } = {};

const calculateDirection = (player: Player) => {
    if(directions[player.steamid] && !player.state.health) return directions[player.steamid];

    const [ forwardV1, forwardV2 ] = player.forward;
    let direction = 0;

    const [axisA, axisB] = [ Math.asin(forwardV1), Math.acos(forwardV2) ].map(axis => axis*180/Math.PI);

    if (axisB < 45) {
        direction = Math.abs(axisA);
    } else if (axisB > 135) {
        direction = 180 - Math.abs(axisA);
    } else {
        direction = axisB;
    }

    if (axisA < 0) {
        direction = -(direction -= 360);
    }

    if(!directions[player.steamid]) {
        directions[player.steamid] = direction;
    }

    const previous = directions[player.steamid];

    let modifier = previous;
    modifier -= 360*Math.floor(previous/360);
    modifier = -(modifier -= direction);

    if(Math.abs(modifier) > 180){
        modifier -= 360*Math.abs(modifier)/modifier;
    }
    directions[player.steamid] += modifier;

    return directions[player.steamid];
}

interface IProps {
    players: Player[],
    bomb?: Bomb | null,
    player: Player | null,
    grenades?: any
    size?: number,
    mapName: string
}

class App extends React.Component<IProps> {
    round = (n: number) => {
        const r = 0.02;
        return Math.round(n / r) * r;
    }

    parsePosition = (position: number[], size: number) => {
        if (!(this.props.mapName in maps)) {
            return [0, 0];
        }
        const { config } = maps[this.props.mapName];
        const left = config.origin.x + (position[0] * config.pxPerUX) - (size / 2);
        const top = config.origin.y + (position[1] * config.pxPerUY) - (size / 2);

        return [this.round(left), this.round(top)];
    }

    parseGrenadePosition = (grenade: ExtendedGrenade) => {
        if (!("position" in grenade)) {
            return null;
        }
        let size = 30;
        if (grenade.type === "smoke") {
            size = 40;
        }
        return this.parsePosition(grenade.position.split(", ").map(pos => Number(pos)), size);
    }
    getGrenadePosition = (grenade: ExtendedGrenade) => {
        const grenadeData = grenadesStates.slice(0, 5).map(grenades => grenades.filter(gr => gr.id === grenade.id)[0]).filter(pl => !!pl);
        if (grenadeData.length === 0) return null;
        const positions = grenadeData.map(grenadeEntry => this.parseGrenadePosition(grenadeEntry)).filter(posData => posData !== null) as number[][];
        if (positions.length === 0) return null;
        const entryAmount = positions.length;
        let x = 0;
        let y = 0;
        for (const position of positions) {
            x += position[0];
            y += position[1];
        }

        return [x / entryAmount, y / entryAmount];
    }
    getPosition = (player: Player) => {
        const playerData = playersStates.slice(0, 5).map(players => players.filter(pl => pl.steamid === player.steamid)[0]).filter(pl => !!pl);
        if (playerData.length === 0) return [0, 0];
        const positions = playerData.map(playerEntry => this.parsePosition(playerEntry.position, config.playerSize));
        const entryAmount = positions.length;
        let x = 0;
        let y = 0;
        for (const position of positions) {
            x += position[0];
            y += position[1];
        }

        const degree = calculateDirection(player);
        return [x / entryAmount, y / entryAmount, degree];
    }
    mapPlayer = (active: Player | null) => (player: Player): RadarPlayerObject => {
        const position = this.getPosition(player);
        const playerObject: RadarPlayerObject = {
            label: player.observer_slot !== undefined ? player.observer_slot : "",
            side: player.team.side,
            position,
            isActive: !!active && active.steamid === player.steamid,
            forward: 0,
            steamid: player.steamid,
            isAlive: player.state.health > 0,
            hasBomb: !!Object.values(player.weapons).find(weapon => weapon.type === "C4")
        }
        return playerObject;
    }
    mapGrenade = (extGrenade: ExtendedGrenade) => {
        if (extGrenade.type === "inferno") {
            const flames = Object.keys(extGrenade.flames).map(id => ({ position: this.parsePosition(extGrenade.flames[id].split(", ").map(pos => Number(pos)), 12), id }));
            const flameObjects: RadarGrenadeObject[] = flames.map(flame => ({
                ...flame,
                type: 'inferno',
                state: 'landed'
            }));
            return flameObjects;
        }
        const position = this.getGrenadePosition(extGrenade);
        if (!position) return null;
        const grenadeObject: RadarGrenadeObject = {
            type: extGrenade.type,
            state: 'inair',
            position,
            id: extGrenade.id
        }
        if (extGrenade.type === "smoke") {
            if (extGrenade.effecttime !== "0.0") {
                grenadeObject.state = "landed";
                if (Number(extGrenade.effecttime) >= 16.5) {
                    grenadeObject.state = 'exploded';
                }
            }
        } else if (extGrenade.type === 'flashbang' || extGrenade.type === 'frag') {
            if (Number(extGrenade.lifetime) >= 1.25) {
                grenadeObject.state = 'exploded';
            }
        }
        return grenadeObject;
    }
    render() {
        const players = this.props.players.map(this.mapPlayer(this.props.player));
        playersStates.unshift(this.props.players);
        if (playersStates.length > 5) {
            playersStates = playersStates.slice(0, 5);
        }
        let grenades: RadarGrenadeObject[] = [];
        const currentGrenades = Object.keys(this.props.grenades as { [key: string]: Grenade }).map(grenadeId => ({ ...this.props.grenades[grenadeId], id: grenadeId })) as ExtendedGrenade[];
        if (currentGrenades) {
            grenades = currentGrenades.map(this.mapGrenade).filter(entry => entry !== null).flat() as RadarGrenadeObject[];
            grenadesStates.unshift(currentGrenades);
        }
        if (grenadesStates.length > 5) {
            grenadesStates = grenadesStates.slice(0, 5);
        }
        const size = this.props.size || 300;
        const offset = (size - (size * size / 1024)) / 2;
        // s*(1024-s)/2048
        if (!(this.props.mapName in maps)) {
            return <div className="map-container" style={{ width: size, height: size, transform: `scale(${size / 1024})`, top: -offset, left: -offset }}>
                Unsupported map
            </div>;
        }
        return <div className="map-container" style={{ width: size, height: size, transform: `scale(${size / 1024})`, top: -offset, left: -offset }}>
            <LexoRadar
                players={players}
                grenades={grenades}
                parsePosition={this.parsePosition}
                bomb={this.props.bomb}
                mapName={this.props.mapName}
            />
        </div>;
    }
}

export default App;
