const { pipeline } = require('D:/danphe-native/src/index');

const jsx = `
reg hub:: status, stream, share, gallery, flip, torch;

export default function App() {
  return (
    <div rx="hub::status">
      <button tx="hub::stream">Live</button>
      <button tx="hub::share">Share</button>
      <button tx="hub::gallery">Gallery</button>
      <button tx="hub::flip">Flip</button>
      <button tx="hub::torch">Torch</button>
    </div>
  );
}
`;

const res = pipeline.compileToAndroidBinary(jsx);
console.log('Compiled OK, bytes:', res.length);
