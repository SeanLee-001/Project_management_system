package com.projectmanagement.app;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.devsupport.interfaces.DevSupportManager;
import com.facebook.flipper.core.FlipperConnection;
import com.facebook.flipper.core.FlipperObject;
import com.facebook.flipper.plugin.FlipperPlugin;
import com.facebook.flipper.util.FlipperLogging;

public class ReactFlipperPlugin implements FlipperPlugin {
  private static final String ID = "React";
  private static final String ELEMENT_INSPECTOR_ID = "ElementInspector";

  private final ReactApplicationContext mReactContext;
  private FlipperConnection mConnection;

  public ReactFlipperPlugin(ReactApplicationContext reactContext) {
    mReactContext = reactContext;
  }

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public void onConnect(FlipperConnection connection) {
    mConnection = connection;
  }

  @Override
  public void onDisconnect() {
    mConnection = null;
  }

  @Override
  public void runOnUiThread(Runnable r) {
    mReactContext.runOnUiQueueThread(r);
  }

  public void reportElementInspected(final String name, final int id) {
    if (mConnection != null) {
      final FlipperObject payload =
          new FlipperObject.Builder()
              .put("name", name)
              .put("id", id)
              .build();
      mConnection.send(ELEMENT_INSPECTOR_ID, payload);
    }
  }
}
