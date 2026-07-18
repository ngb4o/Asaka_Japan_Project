import type {
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
};

export function buildProductPayload(form: ProductFormValues): ProductInput {
  const payload: ProductInput = {
    name: form.name.trim(),
    categoryId: form.categoryId,
    price: Number(form.price) || 0,
  };

  if (form.sku?.trim()) payload.sku = form.sku.trim();
  if (form.unit?.trim()) payload.unit = form.unit.trim();
  if (form.unitsPerCase !== "" && form.unitsPerCase !== undefined) {
    payload.unitsPerCase = Number(form.unitsPerCase) || 1;
  }
  if (form.costPrice !== "" && form.costPrice !== undefined) {
    payload.costPrice = Number(form.costPrice);
  }
  if (form.activeIngredient?.trim()) {
    payload.activeIngredient = form.activeIngredient.trim();
  }
  if (form.packaging?.trim()) payload.packaging = form.packaging.trim();
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
    return "Số chai/thùng phải lớn hơn hoặc bằng 1";
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
  unitType: "chai" | "thung";
  note?: string;
};

export function buildInventoryMovementPayload(
  form: InventoryMovementFormValues
): InventoryMovementInput {
  const payload: InventoryMovementInput = {
    warehouseId: form.warehouseId,
    productId: form.productId,
    quantity: Number(form.quantity) || 0,
    unitType: form.unitType || "chai",
  };

  if (form.note?.trim()) payload.note = form.note.trim();

  return payload;
}

export function validateInventoryMovementForm(
  form: InventoryMovementFormValues
): string | null {
  if (!form.warehouseId) return "Vui lòng chọn kho";
  if (!form.productId) return "Vui lòng chọn sản phẩm";
  if (form.quantity === "" || Number(form.quantity) <= 0) {
    return "Số lượng phải lớn hơn 0";
  }
  if (!form.unitType) return "Vui lòng chọn đơn vị nhập/xuất";
  return null;
}
