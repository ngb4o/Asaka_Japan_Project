import type {
  PestTypeOption,
  ProductCategoryInput,
  ProductInput,
  NewsInput,
  WarehouseInput,
  InventoryMovementInput,
} from "@/lib/types";

export type ProductFormValues = {
  name: string;
  categoryId: string;
  price: number | "";
  sku?: string;
  pestType?: string;
  description?: string;
  shortDescription?: string;
  unit?: string;
  unitsPerCase?: number | "";
  costPrice?: number | "";
  activeIngredient?: string;
  packaging?: string;
  image?: string;
  images?: string[];
  displayOrder?: number | "";
  status?: "active" | "inactive";
};

export type ProductCategoryFormValues = {
  name: string;
  description?: string;
  status?: "active" | "inactive";
  pestTypes?: PestTypeOption[];
};

export function buildProductPayload(form: ProductFormValues): ProductInput {
  const payload: ProductInput = {
    name: form.name.trim(),
    categoryId: form.categoryId,
    price: Number(form.price) || 0,
  };

  if (form.sku?.trim()) payload.sku = form.sku.trim();
  payload.unit = "sanpham";
  if (form.unitsPerCase !== "" && form.unitsPerCase !== undefined) {
    payload.unitsPerCase = Number(form.unitsPerCase) || 1;
  } else {
    payload.unitsPerCase = 1;
  }
  payload.packaging =
    payload.unitsPerCase > 1 ? `Thùng ${payload.unitsPerCase} sp` : "";
  if (form.costPrice !== "" && form.costPrice !== undefined) {
    payload.costPrice = Number(form.costPrice);
  }
  if (form.activeIngredient?.trim()) {
    payload.activeIngredient = form.activeIngredient.trim();
  }
  if (form.shortDescription !== undefined) {
    payload.shortDescription = form.shortDescription.trim().slice(0, 300);
  }
  if (form.description !== undefined) {
    payload.description = form.description;
  }
  if (form.images !== undefined) {
    payload.images = form.images.filter((url) => url.trim()).slice(0, 5);
    payload.image = payload.images[0] || "";
  } else if (form.image?.trim()) {
    payload.image = form.image.trim();
    payload.images = [form.image.trim()];
  }
  if (form.displayOrder !== "" && form.displayOrder !== undefined) {
    payload.displayOrder = Math.max(0, Math.floor(Number(form.displayOrder) || 0));
  }
  if (form.status) payload.status = form.status;
  if (form.pestType) payload.pestType = form.pestType;

  return payload;
}

export function buildProductCategoryPayload(
  form: ProductCategoryFormValues
): ProductCategoryInput {
  const payload: ProductCategoryInput = {
    name: form.name.trim(),
  };

  if (form.description?.trim()) payload.description = form.description.trim();
  if (form.status) payload.status = form.status;
  if (form.pestTypes && form.pestTypes.length > 0) {
    payload.pestTypes = form.pestTypes;
  }

  return payload;
}

export function validateProductForm(form: ProductFormValues): string | null {
  if (!form.name.trim()) return "Vui lòng nhập tên sản phẩm";
  if (!form.categoryId) return "Vui lòng chọn loại sản phẩm";
  if (form.price === "" || Number(form.price) < 0) return "Giá bán không hợp lệ";
  if (
    form.unitsPerCase !== "" &&
    form.unitsPerCase !== undefined &&
    Number(form.unitsPerCase) < 1
  ) {
    return "Số sản phẩm/thùng phải lớn hơn hoặc bằng 1";
  }
  if (form.images && form.images.length > 5) {
    return "Mỗi sản phẩm tối đa 5 ảnh";
  }
  if (form.shortDescription && form.shortDescription.length > 300) {
    return "Mô tả ngắn tối đa 300 ký tự";
  }
  if (form.description && form.description.length > 20000) {
    return "Mô tả chi tiết tối đa 20.000 ký tự";
  }
  if (
    form.displayOrder !== "" &&
    form.displayOrder !== undefined &&
    Number(form.displayOrder) < 0
  ) {
    return "Thứ tự hiển thị phải ≥ 0";
  }
  return null;
}

export function validateProductCategoryForm(
  form: ProductCategoryFormValues
): string | null {
  if (!form.name.trim()) return "Vui lòng nhập tên loại sản phẩm";
  if (form.name.trim().length < 2) return "Tên loại phải có ít nhất 2 ký tự";
  if (form.pestTypes) {
    const duplicates = form.pestTypes
      .map(pt => pt.value)
      .filter((v, i, arr) => arr.indexOf(v) !== i);
    if (duplicates.length > 0) {
      return `Giá trị loại con bị trùng: ${duplicates.join(', ')}`;
    }
    for (const pt of form.pestTypes) {
      if (!pt.value.trim()) return "Giá trị loại con không được trống";
      if (!pt.label.trim()) return "Nhãn loại con không được trống";
    }
  }
  return null;
}

export type NewsFormValues = {
  title: string;
  content: string;
  image?: string;
  status?: "active" | "inactive";
};

export function buildNewsPayload(form: NewsFormValues): NewsInput {
  const payload: NewsInput = {
    title: form.title.trim(),
    content: form.content.trim(),
  };

  if (form.image?.trim()) payload.image = form.image.trim();
  if (form.status) payload.status = form.status;

  return payload;
}

export function validateNewsForm(form: NewsFormValues): string | null {
  if (!form.title.trim()) return "Vui lòng nhập tiêu đề";
  if (form.title.trim().length < 2) return "Tiêu đề phải có ít nhất 2 ký tự";
  if (!form.content.trim()) return "Vui lòng nhập nội dung";
  if (form.content.trim().length < 2) return "Nội dung quá ngắn";
  if (form.content.length > 50000) return "Nội dung tối đa 50.000 ký tự";
  return null;
}

export type WarehouseFormValues = {
  name: string;
  code?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  note?: string;
  status?: "active" | "inactive";
};

export function buildWarehousePayload(form: WarehouseFormValues): WarehouseInput {
  const payload: WarehouseInput = {
    name: form.name.trim(),
  };

  if (form.code?.trim()) payload.code = form.code.trim();
  if (form.address?.trim()) payload.address = form.address.trim();
  if (form.note?.trim()) payload.note = form.note.trim();
  if (form.status) payload.status = form.status;

  if (
    typeof form.lat === "number" &&
    Number.isFinite(form.lat) &&
    typeof form.lng === "number" &&
    Number.isFinite(form.lng)
  ) {
    payload.lat = form.lat;
    payload.lng = form.lng;
  } else {
    payload.lat = null;
    payload.lng = null;
  }

  return payload;
}

export function validateWarehouseForm(form: WarehouseFormValues): string | null {
  if (!form.name.trim()) return "Vui lòng nhập tên kho";
  if (form.name.trim().length < 2) return "Tên kho phải có ít nhất 2 ký tự";
  return null;
}

export type InventoryMovementFormValues = {
  warehouseId: string;
  productId: string;
  quantity: number | "";
  unitType: "sanpham" | "thung";
  note?: string;
  unitCost?: number | "";
  supplierId?: string;
  dueDate?: string;
  paymentStatus?: "unpaid" | "paid";
};

export function buildInventoryMovementPayload(
  form: InventoryMovementFormValues
): InventoryMovementInput {
  const payload: InventoryMovementInput = {
    warehouseId: form.warehouseId,
    productId: form.productId,
    quantity: Number(form.quantity) || 0,
    unitType: form.unitType || "sanpham",
  };

  if (form.note?.trim()) payload.note = form.note.trim();
  if (form.unitCost !== "" && form.unitCost !== undefined) {
    payload.unitCost = Number(form.unitCost) || 0;
  }
  if (form.supplierId) {
    payload.supplierId = form.supplierId;
    payload.paymentStatus = form.paymentStatus || "unpaid";
    if (form.paymentStatus !== "paid" && form.dueDate?.trim()) {
      payload.dueDate = form.dueDate.trim();
    }
  }

  return payload;
}

export function validateInventoryMovementForm(
  form: InventoryMovementFormValues,
  type?: "import" | "export"
): string | null {
  if (!form.warehouseId) return "Vui lòng chọn kho";
  if (!form.productId) return "Vui lòng chọn sản phẩm";
  if (form.quantity === "" || Number(form.quantity) <= 0) {
    return "Số lượng phải lớn hơn 0";
  }
  if (!form.unitType) return "Vui lòng chọn đơn vị nhập/xuất";
  if (type === "import") {
    if (form.unitCost === "" || form.unitCost === undefined) {
      return "Vui lòng nhập giá nhập";
    }
    if (Number(form.unitCost) < 0) return "Giá nhập không hợp lệ";
  }
  return null;
}
