#import <AVFoundation/AVFoundation.h>
#import <IOKit/pwr_mgt/IOPMLib.h>

// Each player is owned by Rust and accessed only while its Runtime mutex is held.
void *nr_audio_create(const unsigned char *bytes, size_t length) {
    @autoreleasepool {
        NSData *data = [NSData dataWithBytes:bytes length:length];
        AVAudioPlayer *player = [[AVAudioPlayer alloc] initWithData:data error:nil];
        return (__bridge_retained void *)player;
    }
}
int nr_audio_play(void *handle) {
    @autoreleasepool {
        AVAudioPlayer *player = (__bridge AVAudioPlayer *)handle;
        player.currentTime = 0;
        return [player play] ? 1 : 0;
    }
}
void nr_audio_stop(void *handle) {
    @autoreleasepool { [(__bridge AVAudioPlayer *)handle stop]; }
}
void nr_audio_destroy(void *handle) {
    @autoreleasepool {
        AVAudioPlayer *player = (__bridge_transfer AVAudioPlayer *)handle;
        [player stop];
    }
}
int nr_awake_create(unsigned int *identifier) {
    // Display-idle prevention also prevents idle system sleep; explicit sleep remains possible.
    return IOPMAssertionCreateWithName(kIOPMAssertionTypePreventUserIdleDisplaySleep,
        kIOPMAssertionLevelOn, CFSTR("NextRound active workout"), identifier);
}
int nr_awake_release(unsigned int identifier) {
    return IOPMAssertionRelease(identifier);
}
