require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
  extensions: ['.ts', '.tsx']
});

const React = require('react');
const ReactDOMServer = require('react-dom/server');

try {
  // Let's import MDTComponents and see what happens
  const MDTComponents = require('./src/features/mdt/MDTComponents.tsx');
  console.log("MDTComponents loaded:", Object.keys(MDTComponents));
  
  // Try rendering IntakePhase
  // IntakePhase({ onComplete, activeCase, isPreparing, onElevateParallel, onReviewPastMDT, onResumeActiveCase })
  console.log("Rendering IntakePhase...");
  try {
    const html = ReactDOMServer.renderToString(React.createElement(MDTComponents.IntakePhase, {
      onComplete: () => {},
      activeCase: null,
      isPreparing: false,
    }));
    console.log("IntakePhase OK");
  } catch(e) {
    console.error("IntakePhase CRASH:", e.message);
  }

} catch (err) {
  console.error("Error:", err);
}
