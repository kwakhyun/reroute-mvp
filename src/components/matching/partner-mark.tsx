import { Buildings, HandHeart, Recycle, UsersThree } from "@phosphor-icons/react/dist/ssr";
import type { PartnerType } from "@/server/db/schema";

const iconByType = {
  BUSINESS: Buildings,
  EMPLOYEE: UsersThree,
  NONPROFIT: HandHeart,
  RECYCLER: Recycle,
} satisfies Record<PartnerType, typeof Buildings>;

export function PartnerMark({ type }: { type: PartnerType }) {
  const Icon = iconByType[type];
  return (
    <span className={`partner-mark partner-mark-${type.toLowerCase()}`} aria-hidden="true">
      <Icon size={30} weight="regular" />
    </span>
  );
}
