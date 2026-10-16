#import <AppKit/AppKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#include <string.h>

// Only user-selected URLs cross this boundary. Access stays scoped to the panel operation.
int nr_workout_file(int saving, const unsigned char *bytes, size_t length,
                    unsigned char *output, size_t *outputLength, size_t limit,
                    char *message, size_t capacity) {
    @autoreleasepool {
        NSURL *url = nil;
        if (saving) {
            NSSavePanel *panel = [NSSavePanel savePanel];
            panel.nameFieldStringValue = @"NextRound-workout.json";
            panel.allowedContentTypes = @[UTTypeJSON];
            panel.canCreateDirectories = YES;
            if ([panel runModal] != NSModalResponseOK) return 0;
            url = panel.URL;
        } else {
            NSOpenPanel *panel = [NSOpenPanel openPanel];
            panel.allowedContentTypes = @[UTTypeJSON];
            panel.allowsMultipleSelection = NO;
            panel.canChooseDirectories = NO;
            if ([panel runModal] != NSModalResponseOK) return 0;
            url = panel.URL;
        }
        if (!url) return -1;
        BOOL scoped = [url startAccessingSecurityScopedResource];
        NSError *error = nil;
        BOOL success = NO;
        @try {
            if (saving) {
                success = [[NSData dataWithBytes:bytes length:length] writeToURL:url options:NSDataWritingAtomic error:&error];
            } else {
                NSNumber *regular = nil;
                [url getResourceValue:&regular forKey:NSURLIsRegularFileKey error:&error];
                if (regular.boolValue && !error) {
                    NSFileHandle *file = [NSFileHandle fileHandleForReadingFromURL:url error:&error];
                    if (file) {
                        NSData *data = [file readDataUpToLength:limit + 1 error:&error];
                        [file closeFile];
                        if (data && !error && data.length > 0 && data.length <= limit) {
                            memcpy(output, data.bytes, data.length);
                            *outputLength = data.length;
                            success = YES;
                        }
                    }
                }
            }
        } @catch (NSException *exception) {
            error = [NSError errorWithDomain:@"NextRoundWorkoutFile" code:1 userInfo:@{NSLocalizedDescriptionKey: @"The selected file could not be accessed."}];
        } @finally {
            if (scoped) [url stopAccessingSecurityScopedResource];
        }
        if (!success && capacity > 0) strlcpy(message, (error.localizedDescription ?: @"Choose a non-empty regular JSON file no larger than 1 MiB.").UTF8String, capacity);
        return success ? 1 : -1;
    }
}
