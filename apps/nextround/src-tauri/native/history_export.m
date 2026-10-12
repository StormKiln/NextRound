#import <AppKit/AppKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#include <string.h>

int nr_save_history_csv(const unsigned char *bytes, size_t length, char *message, size_t capacity) {
    @autoreleasepool {
        NSSavePanel *panel = [NSSavePanel savePanel];
        panel.nameFieldStringValue = @"NextRound-workout-history.csv";
        panel.allowedContentTypes = @[UTTypeCommaSeparatedText];
        panel.canCreateDirectories = YES;
        if ([panel runModal] != NSModalResponseOK) return 0;
        NSURL *url = panel.URL;
        if (!url) return -1;
        BOOL scoped = [url startAccessingSecurityScopedResource];
        NSError *error = nil;
        BOOL saved = [[NSData dataWithBytes:bytes length:length] writeToURL:url options:NSDataWritingAtomic error:&error];
        if (scoped) [url stopAccessingSecurityScopedResource];
        if (!saved && capacity > 0) {
            strlcpy(message, (error.localizedDescription ?: @"The CSV file could not be saved.").UTF8String, capacity);
        }
        return saved ? 1 : -1;
    }
}
