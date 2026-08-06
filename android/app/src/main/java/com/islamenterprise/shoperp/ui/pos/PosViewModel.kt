package com.islamenterprise.shoperp.ui.pos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.islamenterprise.shoperp.data.model.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PosViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(PosUiState())
    val uiState: StateFlow<PosUiState> = _uiState.asStateFlow()

    init {
        loadInitialData()
    }

    fun loadInitialData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            // Sample Bogura Colony Bazar Data for offline/demo preview
            val sampleProducts = listOf(
                Product(1, "MS Rod 8mm (500W)", "rod", "BSRM", "8mm", "kg", 88.0, 95.0, 92.0, 1200.0, 200.0),
                Product(2, "MS Rod 10mm (500W)", "rod", "BSRM", "10mm", "kg", 87.0, 94.0, 91.0, 2500.0, 300.0),
                Product(3, "MS Rod 12mm (500W)", "rod", "BSRM", "12mm", "kg", 86.0, 93.0, 90.0, 3000.0, 500.0),
                Product(4, "MS Rod 16mm (500W)", "rod", "BSRM", "16mm", "kg", 86.0, 93.0, 90.0, 2800.0, 500.0),
                Product(5, "MS Rod 10mm TMT", "rod", "AKS", "10mm", "kg", 85.0, 92.0, 89.0, 1800.0, 300.0),
                Product(6, "Cement OPC (50kg)", "cement", "Shah Cement", "50kg bag", "bag", 480.0, 540.0, 520.0, 350.0, 50.0),
                Product(7, "Cement PCC (50kg)", "cement", "Shah Cement", "50kg bag", "bag", 450.0, 510.0, 490.0, 400.0, 60.0),
                Product(8, "Cement PCC (50kg)", "cement", "Bashundhara", "50kg bag", "bag", 460.0, 520.0, 500.0, 300.0, 50.0),
                Product(9, "Cement OPC (50kg)", "cement", "Seven Rings", "50kg bag", "bag", 475.0, 535.0, 515.0, 250.0, 40.0),
                Product(10, "Binding Wire (Gi Wire)", "other", "Local", "20 Gauge", "kg", 120.0, 145.0, 135.0, 150.0, 20.0),
                Product(11, "Steel Nails 2 inch", "other", "Local", "2 inch", "kg", 110.0, 135.0, 125.0, 80.0, 15.0),
                Product(12, "Red Brick 1st Class", "other", "ABC Bricks", "Standard", "pcs", 11.0, 14.0, 13.0, 10000.0, 2000.0)
            )

            val sampleCustomers = listOf(
                Customer(1, "Haji Alimullah Traders", "01711223344", "Satmatha, Bogura", "wholesale", 4500.0),
                Customer(2, "Bogura Hardware & Building Store", "01812345678", "Colony Bazar, Bogura", "retail", 0.0),
                Customer(3, "Engineer Tareq Hossain", "01715998877", "Thanthania, Bogura", "retail", 1200.0),
                Customer(4, "Karim Enterprise", "01911445566", "Jahangirabad, Bogura", "wholesale", 0.0),
                Customer(5, "Master Construction Ltd", "01720112233", "Sherpur Road, Bogura", "wholesale", 18500.0)
            )

            val sampleAccounts = listOf(
                Account(1, "Cash at Shop (Colony Bazar)", "cash", "", 50000.0),
                Account(2, "Agrani Bank (Bogura Main)", "bank", "AGB-02000188921", 250000.0),
                Account(3, "Rupali Bank (Colony Bazar)", "bank", "RPB-4412098711", 180000.0),
                Account(4, "National Bank (Bogura Branch)", "bank", "NBL-1092004512", 320000.0)
            )

            _uiState.update {
                it.copy(
                    products = sampleProducts,
                    customers = sampleCustomers,
                    accounts = sampleAccounts,
                    selectedAccount = sampleAccounts.firstOrNull(),
                    isLoading = false
                )
            }
        }
    }

    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun onCategorySelected(category: String) {
        _uiState.update { it.copy(selectedCategory = category) }
    }

    fun onSaleTypeChanged(saleType: String) {
        _uiState.update { state ->
            val updatedCart = state.cartItems.map { item ->
                val newPrice = if (saleType == "wholesale") item.product.wholesalePrice else item.product.retailPrice
                item.copy(unitPrice = newPrice)
            }
            state.copy(saleType = saleType, cartItems = updatedCart)
        }
    }

    fun addToCart(product: Product) {
        _uiState.update { state ->
            val existing = state.cartItems.find { it.product.id == product.id }
            val unitPrice = if (state.saleType == "wholesale") product.wholesalePrice else product.retailPrice

            val updatedCart = if (existing != null) {
                state.cartItems.map {
                    if (it.product.id == product.id) it.copy(qty = it.qty + 1) else it
                }
            } else {
                state.cartItems + CartItem(product, 1.0, unitPrice)
            }
            state.copy(cartItems = updatedCart)
        }
    }

    fun updateCartQty(productId: Int, newQty: Double) {
        if (newQty <= 0) {
            removeFromCart(productId)
            return
        }
        _uiState.update { state ->
            val updatedCart = state.cartItems.map {
                if (it.product.id == productId) it.copy(qty = newQty) else it
            }
            state.copy(cartItems = updatedCart)
        }
    }

    fun removeFromCart(productId: Int) {
        _uiState.update { state ->
            state.copy(cartItems = state.cartItems.filterNot { it.product.id == productId })
        }
    }

    fun selectCustomer(customer: Customer?) {
        _uiState.update { state ->
            val newSaleType = if (customer?.type == "wholesale") "wholesale" else state.saleType
            state.copy(selectedCustomer = customer, saleType = newSaleType)
        }
    }

    fun selectAccount(account: Account?) {
        _uiState.update { it.copy(selectedAccount = account) }
    }

    fun updateDiscount(discount: Double) {
        _uiState.update { it.copy(discount = discount.coerceAtLeast(0.0)) }
    }

    fun updatePaidAmount(paid: Double) {
        _uiState.update { it.copy(paidAmount = paid.coerceAtLeast(0.0)) }
    }

    fun completeCheckout() {
        val currentState = _uiState.value
        if (currentState.cartItems.isEmpty()) return
        if (currentState.isCreditSaleBlocked) {
            _uiState.update { it.copy(errorMessage = "Due sales require selecting a registered customer.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            // Simulate API POST /api/sales checkout
            kotlinx.coroutines.delay(1000)
            _uiState.update {
                it.copy(
                    isLoading = false,
                    isCheckoutSuccess = true,
                    cartItems = emptyList(),
                    discount = 0.0,
                    paidAmount = 0.0,
                    note = ""
                )
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null, isCheckoutSuccess = false) }
    }
}
