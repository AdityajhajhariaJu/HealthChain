/** Keep decorative animation runtimes out of the public rendering dependency graph. */
export function publicStaticBoundaries() {
  return {
    name: 'public-static-boundaries',
    apply: 'build',
    generateBundle() {
      const roots = [...this.getModuleIds()].filter((id) =>
        /\/src\/(?:main\.tsx|features\/auth\/Landing\.tsx)$/.test(id.replace(/\\/g, '/'))
      );
      if (roots.length !== 2) this.error('Could not identify both public render entry modules.');
      const visited = new Set();
      const visit = (id) => {
        if (visited.has(id)) return;
        visited.add(id);
        if (
          /\/node_modules\/(?:framer-motion|motion-dom|motion-utils)\//.test(id.replace(/\\/g, '/'))
        )
          this.error(`Animation runtime entered public rendering: ${id}`);
        for (const dependency of this.getModuleInfo(id)?.importedIds || []) visit(dependency);
      };
      roots.forEach(visit);
    },
  };
}
