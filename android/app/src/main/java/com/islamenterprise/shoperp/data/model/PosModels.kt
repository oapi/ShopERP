package com.islamenterprise.shoperp.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: Int,
    val name: String,
    val category: String,
    val brand: String = "",
    val size: String = "",
    val unit: String = "pcs",
    val purchasePrice: Double = 0.0,
    val retailPrice: Double = 0.0,
    val wholesalePrice: Double = 0.0,
    val stockQty: Double = 0.0,
    val lowStockAlert: Double = 0.0
)

@Serializable
data class Customer(
    val id: Int,
    val name: String,
    val phone: String = "",
    val address: String = "",
    val type: String = "retail",
    val balance: Double = 0.0
)

@Serializable
data class Account(
    val id: Int,
    val name: String,
    val type: String = "cash",
    val accountNumber: String = "",
    val currentBalance: Double = 0.0
)

data class CartItem(
    val product: Product,
    var qty: Double = 1.0,
    var unitPrice: Double = product.retailPrice
) {
    val lineTotal: Double get() = qty * unitPrice
}

data class PosUiState(
    val products: List<Product> = emptyList(),
    val customers: List<Customer> = emptyList(),
    val accounts: List<Account> = emptyList(),
    val selectedCategory: String = "All",
    val searchQuery: String = "",
    val saleType: String = "retail", // "retail" or "wholesale"
    val selectedCustomer: Customer? = null,
    val selectedAccount: Account? = null,
    val cartItems: List<CartItem> = emptyList(),
    val discount: Double = 0.0,
    val paidAmount: Double = 0.0,
    val note: String = "",
    val isLoading: Boolean = false,
    val isCheckoutSuccess: Boolean = false,
    val errorMessage: String? = null
) {
    val subtotal: Double get() = cartItems.sumOf { it.lineTotal }
    val grandTotal: Double get() = (subtotal - discount).coerceAtLeast(0.0)
    val dueBalance: Double get() = (grandTotal - paidAmount).coerceAtLeast(0.0)
    val isCreditSaleBlocked: Boolean get() = dueBalance > 0.009 && selectedCustomer == null
}
