#import <Foundation/Foundation.h>
#import <IOKit/pwr_mgt/IOPMLib.h>
#include <assert.h>
#include <unistd.h>

extern void *nr_audio_create(const unsigned char *, size_t);
extern int nr_audio_play(void *);
extern void nr_audio_stop(void *);
extern void nr_audio_destroy(void *);
extern int nr_awake_create(unsigned int *);
extern int nr_awake_release(unsigned int);

int main(void) {
    @autoreleasepool {
        unsigned int assertion = 0;
        assert(nr_awake_create(&assertion) == 0);
        CFDictionaryRef properties = IOPMAssertionCopyProperties(assertion);
        assert(properties != NULL);
        assert(CFEqual(CFDictionaryGetValue(properties, kIOPMAssertionTypeKey),
            kIOPMAssertionTypePreventUserIdleDisplaySleep));
        CFRelease(properties);
        for (NSString *cue in @[@"tock", @"beep", @"complete"]) {
            NSURL *url = [[NSBundle mainBundle] URLForResource:cue withExtension:@"wav"];
            NSData *data = [NSData dataWithContentsOfURL:url];
            assert(data.length > 0);
            void *player = nr_audio_create(data.bytes, data.length);
            assert(player != NULL);
            assert(nr_audio_play(player) == 1);
            usleep(1000000);
            nr_audio_stop(player);
            nr_audio_destroy(player);
        }
        assert(nr_awake_release(assertion) == 0);
        assert(IOPMAssertionCopyProperties(assertion) == NULL);
        puts("Sandbox media smoke passed: three cues started; display-idle assertion created and released.");
    }
    return 0;
}
