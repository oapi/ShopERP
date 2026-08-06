package com.islamenterprise.shoperp.ui.pos;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;

@ScopeMetadata
@QualifierMetadata
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava",
    "cast",
    "deprecation",
    "nullness:initialization.field.uninitialized"
})
public final class PosViewModel_Factory implements Factory<PosViewModel> {
  @Override
  public PosViewModel get() {
    return newInstance();
  }

  public static PosViewModel_Factory create() {
    return InstanceHolder.INSTANCE;
  }

  public static PosViewModel newInstance() {
    return new PosViewModel();
  }

  private static final class InstanceHolder {
    static final PosViewModel_Factory INSTANCE = new PosViewModel_Factory();
  }
}
