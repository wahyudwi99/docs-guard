#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VideoWatermark, "VideoWatermark",
           CAP_PLUGIN_METHOD(addTextWatermark, CAPPluginReturnPromise)
           CAP_PLUGIN_METHOD(ping, CAPPluginReturnPromise)
)
