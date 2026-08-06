package com.islamenterprise.shoperp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import com.islamenterprise.shoperp.ui.pos.PosScreen
import com.islamenterprise.shoperp.ui.pos.PosViewModel
import com.islamenterprise.shoperp.ui.theme.IslamEnterpriseTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val posViewModel: PosViewModel by viewModels()

    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val windowSizeClass = calculateWindowSizeClass(this)
            val isTablet = windowSizeClass.widthSizeClass == WindowWidthSizeClass.Expanded ||
                    windowSizeClass.widthSizeClass == WindowWidthSizeClass.Medium

            IslamEnterpriseTheme {
                PosScreen(
                    viewModel = posViewModel,
                    isTablet = isTablet,
                    onNavigateBack = { finish() }
                )
            }
        }
    }
}
