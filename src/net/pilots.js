// Pilot names are generated from the pilot's anonymous ID, so nothing on the field is typed by a
// player. Same ID, same name, on every device.
import {hashStr} from '../core/thrower.js';

const ADJ=['Amber','Azure','Brisk','Calm','Cedar','Clear','Coral','Dawn','Drifting','Dusk','Fern','Gentle','Golden','Hazel','Ivory','Jade',
  'Juniper','Kind','Lilac','Linen','Lucky','Maple','Misty','Moss','Nimble','Olive','Pebble','Quiet','Rose','Russet','Sage','Silver',
  'Slate','Sunny','Swift','Teal','Tidal','Velvet','Willow','Windy'];
const BIRD=['Albatross','Avocet','Bunting','Crane','Curlew','Dove','Dunlin','Egret','Falcon','Finch','Gannet','Godwit','Heron','Kestrel',
  'Kingfisher','Kite','Lapwing','Lark','Linnet','Martin','Merlin','Osprey','Owl','Petrel','Plover','Puffin','Robin','Sandpiper','Shearwater',
  'Skylark','Sparrow','Starling','Swallow','Swift','Tern','Thrush','Warbler','Wagtail','Wren','Yellowhammer'];

export function pilotName(uid){if(!uid)return'';const h=hashStr(String(uid));const a=ADJ[h%ADJ.length],b=BIRD[Math.floor(h/ADJ.length)%BIRD.length];return a===b?a+' '+BIRD[0]:a+' '+b;}
