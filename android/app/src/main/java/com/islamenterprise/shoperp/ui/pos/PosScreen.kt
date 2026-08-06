package com.islamenterprise.shoperp.ui.pos

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.islamenterprise.shoperp.data.model.*
import java.util.Locale

@Composable
fun PosScreen(
    viewModel: PosViewModel,
    isTablet: Boolean = false, // Responsive Layout Switcher
    onNavigateBack: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var showMobileCartSheet by remember { mutableStateOf(false) }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "CoreTrade ERP — POS",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            "Colony Bazar, Bogura",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    // Sale Type Selector Pill
                    FilterChip(
                        selected = uiState.saleType == "wholesale",
                        onClick = {
                            viewModel.onSaleTypeChanged(if (uiState.saleType == "wholesale") "retail" else "wholesale")
                        },
                        label = { Text(if (uiState.saleType == "wholesale") "Wholesale Tier" else "Retail Tier") },
                        leadingIcon = {
                            Icon(
                                if (uiState.saleType == "wholesale") Icons.Default.Storefront else Icons.Default.ShoppingBag,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (!isTablet) {
                MobileStickyBottomBar(
                    uiState = uiState,
                    onOpenCart = { showMobileCartSheet = true }
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            if (isTablet) {
                // Dual-Pane Layout for Tablets & POS Terminals
                Row(modifier = Modifier.fillMaxSize()) {
                    // Left Pane: Catalog & Filter Chips (60% Width)
                    Box(modifier = Modifier.weight(0.6f)) {
                        ProductCatalogPane(
                            uiState = uiState,
                            onSearchQueryChanged = viewModel::onSearchQueryChanged,
                            onCategorySelected = viewModel::onCategorySelected,
                            onAddToCart = viewModel::addToCart
                        )
                    }

                    VerticalDivider(color = MaterialTheme.colorScheme.outlineVariant)

                    // Right Pane: Real-Time Cart & One-Tap Checkout (40% Width)
                    Box(modifier = Modifier.weight(0.4f)) {
                        PosCartPane(
                            uiState = uiState,
                            onUpdateQty = viewModel::updateCartQty,
                            onRemoveItem = viewModel::removeFromCart,
                            onSelectCustomer = viewModel::selectCustomer,
                            onSelectAccount = viewModel::selectAccount,
                            onUpdateDiscount = viewModel::updateDiscount,
                            onUpdatePaidAmount = viewModel::updatePaidAmount,
                            onCompleteCheckout = viewModel::completeCheckout
                        )
                    }
                }
            } else {
                // Single-Pane Layout for Mobile Phones
                ProductCatalogPane(
                    uiState = uiState,
                    onSearchQueryChanged = viewModel::onSearchQueryChanged,
                    onCategorySelected = viewModel::onCategorySelected,
                    onAddToCart = viewModel::addToCart
                )

                if (showMobileCartSheet) {
                    ModalBottomSheet(
                        onDismissRequest = { showMobileCartSheet = false }
                    ) {
                        PosCartPane(
                            uiState = uiState,
                            onUpdateQty = viewModel::updateCartQty,
                            onRemoveItem = viewModel::removeFromCart,
                            onSelectCustomer = viewModel::selectCustomer,
                            onSelectAccount = viewModel::selectAccount,
                            onUpdateDiscount = viewModel::updateDiscount,
                            onUpdatePaidAmount = viewModel::updatePaidAmount,
                            onCompleteCheckout = {
                                viewModel.completeCheckout()
                                showMobileCartSheet = false
                            }
                        )
                    }
                }
            }
        }
    }
}

// ----------------------------------------------------
// PRODUCT CATALOG PANE (Grid + Filter Chips)
// ----------------------------------------------------
@Composable
fun ProductCatalogPane(
    uiState: PosUiState,
    onSearchQueryChanged: (String) -> Unit,
    onCategorySelected: (String) -> Unit,
    onAddToCart: (Product) -> Unit
) {
    val categories = listOf("All", "rod", "cement", "other")

    val filteredProducts = remember(uiState.products, uiState.selectedCategory, uiState.searchQuery) {
        uiState.products.filter { p ->
            val matchesCategory = uiState.selectedCategory == "All" || p.category.equals(uiState.selectedCategory, ignoreCase = true)
            val matchesSearch = uiState.searchQuery.isEmpty() ||
                    p.name.contains(uiState.searchQuery, ignoreCase = true) ||
                    p.brand.contains(uiState.searchQuery, ignoreCase = true) ||
                    p.size.contains(uiState.searchQuery, ignoreCase = true)
            matchesCategory && matchesSearch
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Search Bar with Camera Icon
        OutlinedTextField(
            value = uiState.searchQuery,
            onValueChange = onSearchQueryChanged,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search product name, brand, or size...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = {
                IconButton(onClick = { /* Launch Barcode Scanner */ }) {
                    Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan Barcode", tint = MaterialTheme.colorScheme.primary)
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(14.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Category Pills
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            categories.forEach { category ->
                val isSelected = uiState.selectedCategory == category
                FilterChip(
                    selected = isSelected,
                    onClick = { onCategorySelected(category) },
                    label = { Text(category.replaceFirstChar { it.uppercase() }) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Product Catalog Grid
        if (filteredProducts.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No products found", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredProducts) { product ->
                    ProductCard(
                        product = product,
                        saleType = uiState.saleType,
                        onAddToCart = { onAddToCart(product) }
                    )
                }
            }
        }
    }
}

@Composable
fun ProductCard(
    product: Product,
    saleType: String,
    onAddToCart: () -> Unit
) {
    val isLowStock = product.stockQty <= product.lowStockAlert
    val price = if (saleType == "wholesale") product.wholesalePrice else product.retailPrice

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onAddToCart),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = product.category.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }

                // Low Stock Badge
                if (isLowStock) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.errorContainer
                    ) {
                        Text(
                            text = "LOW STOCK",
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = product.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = "${product.brand} ${product.size}".trim(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "৳${String.format(Locale.ENGLISH, "%.2f", price)}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Stock: ${product.stockQty.toInt()} ${product.unit}",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isLowStock) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                IconButton(
                    onClick = onAddToCart,
                    modifier = Modifier
                        .size(36.dp)
                        .background(MaterialTheme.colorScheme.primary, CircleShape)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add to Cart", tint = MaterialTheme.colorScheme.onPrimary)
                }
            }
        }
    }
}

// ----------------------------------------------------
// POS CART & CHECKOUT PANE
// ----------------------------------------------------
@Composable
fun PosCartPane(
    uiState: PosUiState,
    onUpdateQty: (Int, Double) -> Unit,
    onRemoveItem: (Int) -> Unit,
    onSelectCustomer: (Customer?) -> Unit,
    onSelectAccount: (Account?) -> Unit,
    onUpdateDiscount: (Double) -> Unit,
    onUpdatePaidAmount: (Double) -> Unit,
    onCompleteCheckout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text("Current Cart", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

        Spacer(modifier = Modifier.height(8.dp))

        // Customer Selection Dropdown
        var customerDropdownExpanded by remember { mutableStateOf(false) }
        ExposedDropdownMenuBox(
            expanded = customerDropdownExpanded,
            onExpandedChange = { customerDropdownExpanded = !customerDropdownExpanded }
        ) {
            OutlinedTextField(
                value = uiState.selectedCustomer?.name ?: "Walk-in Customer (Cash only)",
                onValueChange = {},
                readOnly = true,
                label = { Text("Customer") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = customerDropdownExpanded) },
                modifier = Modifier
                    .menuAnchor()
                    .fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            )
            ExposedDropdownMenu(
                expanded = customerDropdownExpanded,
                onDismissRequest = { customerDropdownExpanded = false }
            ) {
                DropdownMenuItem(
                    text = { Text("Walk-in Customer (Cash only)") },
                    onClick = {
                        onSelectCustomer(null)
                        customerDropdownExpanded = false
                    }
                )
                uiState.customers.forEach { customer ->
                    DropdownMenuItem(
                        text = { Text("${customer.name} (${customer.type}) - Due: ৳${customer.balance}") },
                        onClick = {
                            onSelectCustomer(customer)
                            customerDropdownExpanded = false
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Capital Account Selection Dropdown
        var accountDropdownExpanded by remember { mutableStateOf(false) }
        ExposedDropdownMenuBox(
            expanded = accountDropdownExpanded,
            onExpandedChange = { accountDropdownExpanded = !accountDropdownExpanded }
        ) {
            OutlinedTextField(
                value = uiState.selectedAccount?.name ?: "Select Deposit Account",
                onValueChange = {},
                readOnly = true,
                label = { Text("Deposit Payment To") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = accountDropdownExpanded) },
                modifier = Modifier
                    .menuAnchor()
                    .fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            )
            ExposedDropdownMenu(
                expanded = accountDropdownExpanded,
                onDismissRequest = { accountDropdownExpanded = false }
            ) {
                uiState.accounts.forEach { account ->
                    DropdownMenuItem(
                        text = { Text("${account.name} (Bal: ৳${account.currentBalance})") },
                        onClick = {
                            onSelectAccount(account)
                            accountDropdownExpanded = false
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Cart Item List
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(uiState.cartItems) { item ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(item.product.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text("৳${item.unitPrice} / ${item.product.unit}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { onUpdateQty(item.product.id, item.qty - 1) }, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Remove, contentDescription = "Decrease")
                        }
                        Text("${item.qty.toInt()}", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 8.dp))
                        IconButton(onClick = { onUpdateQty(item.product.id, item.qty + 1) }, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Add, contentDescription = "Increase")
                        }
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Text("৳${String.format(Locale.ENGLISH, "%.2f", item.lineTotal)}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)

                    IconButton(onClick = { onRemoveItem(item.product.id) }) {
                        Icon(Icons.Default.Delete, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Calculations & Soft-Block Alert Banner
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
                .padding(12.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Subtotal:")
                Text("৳${String.format(Locale.ENGLISH, "%.2f", uiState.subtotal)}", fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Discount (৳):")
                OutlinedTextField(
                    value = if (uiState.discount == 0.0) "" else uiState.discount.toString(),
                    onValueChange = { onUpdateDiscount(it.toDoubleOrNull() ?: 0.0) },
                    modifier = Modifier.width(120.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Grand Total:", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("৳${String.format(Locale.ENGLISH, "%.2f", uiState.grandTotal)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Amount Paid (৳):")
                OutlinedTextField(
                    value = if (uiState.paidAmount == 0.0) "" else uiState.paidAmount.toString(),
                    onValueChange = { onUpdatePaidAmount(it.toDoubleOrNull() ?: 0.0) },
                    modifier = Modifier.width(120.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Due Balance:")
                Text(
                    "৳${String.format(Locale.ENGLISH, "%.2f", uiState.dueBalance)}",
                    fontWeight = FontWeight.Bold,
                    color = if (uiState.dueBalance > 0) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                )
            }

            // Soft-Block Credit Warning Banner
            AnimatedVisibility(visible = uiState.isCreditSaleBlocked) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(modifier = Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.onErrorContainer)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Credit sales require a registered customer",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // One-Tap Complete Checkout Button
        Button(
            onClick = onCompleteCheckout,
            enabled = uiState.cartItems.isNotEmpty() && !uiState.isCreditSaleBlocked && !uiState.isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Icon(Icons.Default.CheckCircle, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Complete & Print Invoice", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun MobileStickyBottomBar(
    uiState: PosUiState,
    onOpenCart: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 8.dp,
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("${uiState.cartItems.size} items in cart", style = MaterialTheme.typography.bodyMedium)
                Text(
                    "Total: ৳${String.format(Locale.ENGLISH, "%.2f", uiState.grandTotal)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Button(
                onClick = onOpenCart,
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.ShoppingCart, contentDescription = null)
                Spacer(modifier = Modifier.width(6.dp))
                Text("View Cart")
            }
        }
    }
}
