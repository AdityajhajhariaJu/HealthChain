const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const fileMap = {
  'src/pages/MDTHub.jsx': 'src/features/mdt/MDTHub.jsx',
  'src/pages/MultiSpecialist.jsx': 'src/features/mdt/MultiSpecialist.jsx',
  'src/components/MDTComponents.jsx': 'src/features/mdt/MDTComponents.jsx',
  'src/pages/Dietician.jsx': 'src/features/dietician/Dietician.jsx',
  'src/components/DieticianComponents.jsx': 'src/features/dietician/DieticianComponents.jsx',
  'src/pages/HealthChainAI.jsx': 'src/features/consultation/HealthChainAI.jsx',
  'src/pages/TalkBuddy.jsx': 'src/features/consultation/TalkBuddy.jsx',
  'src/pages/MedicalProfile.jsx': 'src/features/profile/MedicalProfile.jsx',
  'src/pages/ProfileOnboarding.jsx': 'src/features/profile/ProfileOnboarding.jsx',
  'src/pages/Settings.jsx': 'src/features/profile/Settings.jsx',
  'src/pages/CaseDashboard.jsx': 'src/features/dashboard/CaseDashboard.jsx',
  'src/pages/ActionPlan.jsx': 'src/features/dashboard/ActionPlanPage.jsx',
  'src/pages/ClinicalReportAnalyzer.jsx': 'src/features/tools/ClinicalReportAnalyzer.jsx',
  'src/pages/PharmacyHub.jsx': 'src/features/tools/PharmacyHub.jsx',
  'src/pages/AdSimulation.jsx': 'src/features/tools/AdSimulation.jsx',
  'src/pages/Auth.jsx': 'src/features/auth/Auth.jsx',
  'src/pages/Landing.jsx': 'src/features/auth/Landing.jsx',
  'src/components/AppShell.jsx': 'src/components/layout/AppShell.jsx',
  'src/components/ActionPlan.jsx': 'src/components/ui/ActionPlan.jsx',
  'src/components/MedicalRecordsBar.jsx': 'src/components/ui/MedicalRecordsBar.jsx',
  'src/components/InvestigationBoard.jsx': 'src/components/ui/InvestigationBoard.jsx',
  'src/components/WireframeHumanoid.jsx': 'src/components/ui/WireframeHumanoid.jsx',
  'src/App.jsx': 'src/App.jsx' // Include App.jsx so its imports get updated
};

const absoluteMap = {};
for (const [oldPath, newPath] of Object.entries(fileMap)) {
  absoluteMap[path.join(__dirname, path.normalize(oldPath))] = path.join(__dirname, path.normalize(newPath));
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const newFilePath = absoluteMap[filePath] || filePath;
  const newFileDir = path.dirname(newFilePath);

  // Regex to match imports: import ... from './something' or '../something'
  const importRegex = /(import\s+.*?\s+from\s+['"]|import\(\s*['"]|export\s+.*?\s+from\s+['"])([\.\/]+[^'"]+)(['"])/g;

  content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
    // If it's just a local file (e.g. .css), handle it
    if (!importPath.startsWith('.')) return match;

    const oldTargetAbs = path.resolve(path.dirname(filePath), importPath);
    
    // We need to try matching the target path with and without extensions (.js, .jsx)
    let newTargetAbs = oldTargetAbs;
    
    if (absoluteMap[oldTargetAbs]) {
      newTargetAbs = absoluteMap[oldTargetAbs];
    } else if (absoluteMap[oldTargetAbs + '.jsx']) {
      newTargetAbs = absoluteMap[oldTargetAbs + '.jsx'];
    } else if (absoluteMap[oldTargetAbs + '.js']) {
      newTargetAbs = absoluteMap[oldTargetAbs + '.js'];
    }

    // Now calculate the new relative path
    let newRelative = path.relative(newFileDir, newTargetAbs).replace(/\\/g, '/');
    if (!newRelative.startsWith('.')) {
      newRelative = './' + newRelative;
    }
    
    // Drop the extension if the original import didn't have it
    if (!importPath.endsWith('.jsx') && newRelative.endsWith('.jsx')) {
      newRelative = newRelative.slice(0, -4);
    }
    if (!importPath.endsWith('.js') && newRelative.endsWith('.js')) {
      newRelative = newRelative.slice(0, -3);
    }

    return prefix + newRelative + suffix;
  });

  return { newFilePath, content };
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== '__tests__') {
        getAllFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = getAllFiles(srcDir);
const filesToUpdate = [];

// Process all files in memory first
for (const file of allFiles) {
  const { newFilePath, content } = processFile(file);
  filesToUpdate.push({ oldPath: file, newPath: newFilePath, content });
}

// Ensure directories exist and write files
for (const fileObj of filesToUpdate) {
  fs.mkdirSync(path.dirname(fileObj.newPath), { recursive: true });
  fs.writeFileSync(fileObj.newPath, fileObj.content);
}

// Delete old files that were moved
for (const fileObj of filesToUpdate) {
  if (fileObj.oldPath !== fileObj.newPath) {
    if (fs.existsSync(fileObj.oldPath)) {
      fs.unlinkSync(fileObj.oldPath);
    }
  }
}

console.log("Refactoring complete");
