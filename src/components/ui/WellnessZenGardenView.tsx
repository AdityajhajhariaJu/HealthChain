import { ZenGarden } from '../../features/zen-garden/ZenGarden';
interface WellnessZenGardenViewProps {
  onOpenMindfulness?: () => void;
  onClose?: () => void;
}
export const WellnessZenGardenView = (props: WellnessZenGardenViewProps) => (
  <ZenGarden {...props} />
);
