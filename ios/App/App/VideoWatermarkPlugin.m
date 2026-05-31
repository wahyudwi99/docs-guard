#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VideoWatermarkPlugin, "VideoWatermark",
           CAP_PLUGIN_METHOD(addTextWatermark, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(ping, CAPPluginReturnPromise);
)
