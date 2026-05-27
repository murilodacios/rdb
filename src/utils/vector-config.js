export const VECTOR_SIZE = 14;

export const IVF_NLIST = Number(process.env.IVF_NLIST ?? 2048);
export const IVF_NPROBE = Number(process.env.IVF_NPROBE ?? 8);
export const IVF_BBOX_REPAIR_LIMIT = Number(
  process.env.IVF_BBOX_REPAIR_LIMIT ?? 8,
);
