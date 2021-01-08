import React from 'react';
import { isDev, port } from '../../api/api';
import { actions } from '../../App';

import { avatars } from './../../api/avatars';

import { Skull } from './../../assets/Icons';

interface IProps {
  steamid: string,
  slot?: number,
  height?: number,
  width?: number,
  showSkull?: boolean,
  showCam?: boolean
}
interface IState {
  enableCams: boolean
}
export default class Avatar extends React.Component<IProps, IState> {
  state = {
    enableCams: !!this.props.showCam
  }
  componentDidMount(){
    actions.on("toggleCams", () => {
      this.setState({enableCams: !this.state.enableCams})
  });
  }
  render(){
    const { enableCams } = this.state;
    const url = avatars.filter(avatar => avatar.steamid === this.props.steamid)[0];
    if(!url || (!url.steam.length && !url.custom.length)){
        return '';
    }
    const slot = this.props.slot === 0 ? 10 : this.props.slot || 1;
    const leftPosition = - 150*((slot-1)%5);
    const topPosition = slot > 5 ? -150 : 0;
    return (
      <div className={`avatar`}>
          {
            this.props.showCam ? <div  id="cameraFeed" style={{ display: enableCams ? 'block' : 'none'}}><iframe style={{top: `${topPosition}px`, left: `${leftPosition}px`}} src={isDev ? `http://localhost:${port}/rmtp.html` : '/rmtp.html'} title="Camera feed" /></div> : null
          }
          <img src={this.props.showSkull ? Skull : (url.custom || url.steam)} height={this.props.height} width={this.props.width} alt={'Avatar'} />
      </div>
    );
  }

}
