package com.docsguard;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VideoWatermark")
public class VideoWatermarkPlugin extends Plugin {

    @PluginMethod
    public void addTextWatermark(PluginCall call) {
        // For now, we return UNIMPLEMENTED or just reject gracefully 
        // to let the web fallback handle it without a scary error.
        // Or we could implement it using Media3 Transformer.
        call.unimplemented("Android native implementation is currently falling back to high-performance Canvas method.");
    }
}
