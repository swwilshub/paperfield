// Re-flies planes off the main thread for net/verify.js.
import {reflies} from './verify.js';
onmessage=e=>postMessage({id:e.data.id,ok:reflies(e.data)});
