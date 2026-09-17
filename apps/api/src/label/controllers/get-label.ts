import db from "../../database";
import { httpError } from "../../utils/http-error";

async function getLabel(id: string) {
  const label = await db.query.labelTable.findFirst({
    where: (label, { eq }) => eq(label.id, id),
  });

  if (!label) {
    throw httpError(404, "label_not_found", "Label not found");
  }

  return label;
}

export default getLabel;
