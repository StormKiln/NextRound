#import <AppKit/AppKit.h>
#import <CoreServices/CoreServices.h>
#include <stdlib.h>
#include <string.h>

// Apple Events block until Spotify replies, so callers must stay off the main and timer threads.
static NSString *const NRSpotify = @"com.spotify.client";
static NSAppleEventDescriptor *nr_spotify_target(void) {
    return [NSAppleEventDescriptor descriptorWithBundleIdentifier:NRSpotify];
}
int nr_spotify_installed(void) {
    @autoreleasepool {
        return [[NSWorkspace sharedWorkspace] URLForApplicationWithBundleIdentifier:NRSpotify] != nil;
    }
}
int nr_spotify_running(void) {
    @autoreleasepool {
        return [NSRunningApplication runningApplicationsWithBundleIdentifier:NRSpotify].count > 0;
    }
}
int nr_spotify_permission(int ask) {
    @autoreleasepool {
        return AEDeterminePermissionToAutomateTarget(nr_spotify_target().aeDesc, 'spfy', 'Play', ask != 0);
    }
}
static int nr_spotify_send(AEEventClass eventClass, AEEventID eventID, NSAppleEventDescriptor *direct,
    NSAppleEventDescriptor **reply) {
    NSAppleEventDescriptor *event = [NSAppleEventDescriptor appleEventWithEventClass:eventClass
        eventID:eventID targetDescriptor:nr_spotify_target() returnID:kAutoGenerateReturnID
        transactionID:kAnyTransactionID];
    if (direct) [event setParamDescriptor:direct forKeyword:keyDirectObject];
    NSError *error = nil;
    NSAppleEventDescriptor *result = [event sendEventWithOptions:NSAppleEventSendDefaultOptions
        timeout:2 error:&error];
    if (!result) return error ? (int)error.code : errAEEventFailed;
    NSAppleEventDescriptor *failure = [result paramDescriptorForKeyword:keyErrorNumber];
    if (failure && failure.int32Value != noErr) return failure.int32Value;
    if (reply) *reply = [result paramDescriptorForKeyword:keyDirectObject];
    return noErr;
}
static NSAppleEventDescriptor *nr_spotify_property(FourCharCode code, NSAppleEventDescriptor *container) {
    NSAppleEventDescriptor *record = [NSAppleEventDescriptor recordDescriptor];
    [record setDescriptor:[NSAppleEventDescriptor descriptorWithTypeCode:cProperty] forKeyword:keyAEDesiredClass];
    [record setDescriptor:container ?: [NSAppleEventDescriptor nullDescriptor] forKeyword:keyAEContainer];
    [record setDescriptor:[NSAppleEventDescriptor descriptorWithEnumCode:formPropertyID] forKeyword:keyAEKeyForm];
    [record setDescriptor:[NSAppleEventDescriptor descriptorWithTypeCode:code] forKeyword:keyAEKeyData];
    return [record coerceToDescriptorType:typeObjectSpecifier];
}
int nr_spotify_command(int play) {
    @autoreleasepool { return nr_spotify_send('spfy', play ? 'Play' : 'Paus', nil, nil); }
}
// On success *out holds "playing\x1Fname\x1Fartist\x1Fartwork", or NULL when Spotify is not playing.
int nr_spotify_now_playing(char **out) {
    @autoreleasepool {
        *out = NULL;
        NSAppleEventDescriptor *state = nil;
        int status = nr_spotify_send(kAECoreSuite, kAEGetData, nr_spotify_property('pPlS', nil), &state);
        if (status != noErr || state.enumCodeValue != 'kPSP') return status;
        NSAppleEventDescriptor *track = nr_spotify_property('pTrk', nil);
        NSMutableArray<NSString *> *fields = [NSMutableArray arrayWithObject:@"playing"];
        const FourCharCode codes[] = {'pnam', 'pArt', 'aUrl'};
        for (size_t i = 0; i < 3; i++) {
            NSAppleEventDescriptor *value = nil;
            status = nr_spotify_send(kAECoreSuite, kAEGetData, nr_spotify_property(codes[i], track), &value);
            if (status != noErr) return status;
            [fields addObject:[(value.stringValue ?: @"")
                stringByReplacingOccurrencesOfString:@"\x1F" withString:@" "]];
        }
        *out = strdup([fields componentsJoinedByString:@"\x1F"].UTF8String);
        return noErr;
    }
}
void nr_spotify_free(char *value) {
    free(value);
}
