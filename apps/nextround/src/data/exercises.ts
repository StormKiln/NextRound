import type { ExerciseEntry } from '@nextround/core';
export const exercises: ExerciseEntry[] = [
  {
    id: 'squat',
    supportedUnits: ['reps', 'seconds'],
    name: 'Air squat',
    description: 'Sit the hips back and down, keeping the heels grounded. Stand tall to finish.',
  },
  {
    id: 'pushup',
    supportedUnits: ['reps', 'seconds'],
    name: 'Push-up',
    description:
      'Keep a straight line from shoulders to heels. Lower with control and press back up. Elevate your hands to scale.',
  },
  {
    id: 'situp',
    supportedUnits: ['reps', 'seconds'],
    name: 'Sit-up',
    description:
      'Move through a comfortable range with control. Keep the feet grounded and avoid pulling on the neck.',
  },
  {
    id: 'burpee',
    supportedUnits: ['reps', 'seconds'],
    name: 'Burpee',
    description:
      'Step or jump back to a plank, lower with control, then return to standing. Choose a pace you can maintain.',
  },
  {
    id: 'swing',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell swing',
    description:
      'Hinge at the hips and drive through the legs to swing the bell to chest height. Keep the spine neutral.',
  },
  {
    id: 'lunge',
    supportedUnits: ['reps', 'seconds'],
    name: 'Reverse lunge',
    description:
      'Step back, lower both knees, then push through the front foot to stand. Alternate legs.',
  },
  {
    id: 'plank',
    supportedUnits: ['seconds'],
    name: 'Plank',
    description:
      'Brace your trunk and hold a straight line from shoulders to heels. Breathe steadily.',
  },
  {
    id: 'jump',
    supportedUnits: ['reps', 'seconds'],
    name: 'Jump rope',
    description:
      'Use small, relaxed jumps and turn the rope from the wrists. Keep a steady rhythm.',
  },
  {
    id: 'kettlebell-deadlift',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell deadlift',
    description:
      'Grip the bell between your feet with both hands. Send your hips back, then stand with the bell close and your back neutral.',
  },
  {
    id: 'kettlebell-single-leg-deadlift',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell single-leg deadlift',
    description:
      'Hold the bell opposite your standing leg. Hinge as the free leg reaches back, keeping hips level. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-single-arm-swing',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell single-arm swing',
    description:
      'Use one hand and a hip drive to float the bell to chest height. Resist twisting and let the bell return into the hinge. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-clean',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell clean',
    description:
      'Drive from the hips and guide the bell close into the rack at your shoulder, without flipping it onto your wrist. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-snatch',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell snatch',
    description:
      'From a backswing, drive through the hips and guide the bell overhead, inserting your hand smoothly under it. Keep the overhead arm steady. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-goblet-squat',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell goblet squat',
    description:
      'Hold the bell at your chest with both hands. Bend hips and knees together, keep your feet planted, then stand tall.',
  },
  {
    id: 'kettlebell-racked-squat',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell racked squat',
    description:
      'Hold one bell in the rack at your shoulder. Squat with knees following toes and your torso braced. Choose a rack side for the interval.',
  },
  {
    id: 'kettlebell-reverse-lunge',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell racked reverse lunge',
    description:
      'Rack the bell at one shoulder, step the same-side leg back and lower under control. Push through the front foot to return. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-side-lunge',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell side lunge',
    description:
      'Hold the bell at your chest. Step sideways and bend that knee as your hips move back, keeping the other leg long. Push back to standing and alternate sides.',
  },
  {
    id: 'kettlebell-row',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell bent-over row',
    description:
      'Hinge forward with a neutral back. Pull one bell toward your hip, keeping your trunk still, then lower slowly. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-overhead-press',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell overhead press',
    description:
      'From the shoulder rack, press the bell overhead without leg drive or leaning back. Lower with control. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-push-press',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell push press',
    description:
      'From the shoulder rack, dip your knees slightly, then drive with your legs to press overhead. Lower to the rack with control. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-thruster',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell thruster',
    description:
      'Squat with one bell in the shoulder rack, then drive up into an overhead press. Return the bell to the rack before repeating. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-halo',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell halo',
    description:
      'Hold the bell by its horns with both hands and circle it close around your head. Keep your ribs down and move slowly. Alternate directions.',
  },
  {
    id: 'kettlebell-slingshot',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell slingshot',
    description:
      'Stand tall and pass the bell around your waist from hand to hand. Keep your torso still and a secure grip at each handoff. Alternate directions.',
  },
  {
    id: 'kettlebell-suitcase-carry',
    supportedUnits: ['seconds', 'metres'],
    name: 'Kettlebell suitcase carry',
    description:
      'Carry one bell at your side while walking with short, steady steps. Stay tall without leaning toward the weight. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-tall-kneeling-press',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell tall-kneeling press',
    description:
      'Kneel on both knees with hips extended. Press one bell from the shoulder rack overhead, keeping your trunk steady. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-half-kneeling-press',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell half-kneeling press',
    description:
      'With one knee down and the other foot forward, press the bell on the kneeling side overhead without arching your back. Choose a side for the interval.',
  },
  {
    id: 'kettlebell-windmill',
    supportedUnits: ['reps', 'seconds'],
    name: 'Kettlebell windmill',
    description:
      'Hold one bell overhead and turn your feet slightly away from it. Shift hips toward the bell side as your free hand slides down the other leg. Keep the loaded arm vertical. Choose a side for the interval.',
  },
  {
    id: 'pushup-knee',
    supportedUnits: ['reps', 'seconds'],
    name: 'Knee push-up',
    description:
      'Keep your knees on the floor and your trunk aligned from head to knees. Bend your elbows to lower your chest, then press up without sagging at the hips.',
  },
  {
    id: 'pushup-incline',
    supportedUnits: ['reps', 'seconds'],
    name: 'Incline push-up',
    description:
      'Place your hands on a stable bench and step your feet back. Lower your chest toward the bench and press away, keeping your body aligned.',
  },
  {
    id: 'pushup-decline',
    supportedUnits: ['reps', 'seconds'],
    name: 'Decline push-up',
    description:
      'Rest your feet on a stable step with hands on the floor. Lower and press with your trunk braced, keeping your hips in line with your shoulders and heels.',
  },
  {
    id: 'pushup-pike',
    supportedUnits: ['reps', 'seconds'],
    name: 'Pike push-up',
    description:
      'Lift your hips into an inverted V. Bend your elbows to lower your head toward the floor, then press away while keeping your hips high.',
  },
  {
    id: 'pushup-plyometric',
    supportedUnits: ['reps', 'seconds'],
    name: 'Plyometric push-up',
    description:
      'Lower from a firm push-up position, then press fast enough for your hands to leave the floor. Land with soft elbows and reset your alignment before repeating.',
  },
  {
    id: 'plank-high',
    supportedUnits: ['seconds'],
    name: 'High plank',
    description:
      'Place your hands under your shoulders with arms straight. Extend your legs and hold your body aligned from head to heels while breathing steadily.',
  },
  {
    id: 'plank-side',
    supportedUnits: ['seconds'],
    name: 'Side plank',
    description:
      'Support yourself on one forearm with the elbow under your shoulder. Lift your hips and keep your body aligned sideways. Choose a side for the interval.',
  },
  {
    id: 'plank-walkup',
    supportedUnits: ['reps', 'seconds'],
    name: 'Plank walkup',
    description:
      'From a forearm plank, press onto one hand and then the other. Lower one arm at a time without rocking your hips. Alternate the leading arm.',
  },
  {
    id: 'plank-three-tap',
    supportedUnits: ['reps', 'seconds'],
    name: 'Plank with three toe taps',
    description:
      'From a forearm plank, tap one foot to the opposite ankle, then the floor outside that foot, then the ankle again. Return to the start and alternate legs.',
  },
  {
    id: 'plank-quadruped-kickback',
    supportedUnits: ['reps', 'seconds'],
    name: 'Quadruped plank with kickback',
    description:
      'Start on hands and knees, then hover your knees just off the floor. Extend one leg behind you without turning your hips. Return and alternate legs.',
  },
  {
    id: 'squat-prisoner',
    supportedUnits: ['reps', 'seconds'],
    name: 'Prisoner squat',
    description:
      'Rest your hands behind your head without pulling on your neck. Squat with your chest lifted and feet planted, then stand with control.',
  },
  {
    id: 'squat-jump',
    supportedUnits: ['reps', 'seconds'],
    name: 'Jump squat',
    description:
      'Lower into a partial squat, then extend your hips and legs to jump. Land softly with bent knees and regain control before the next repetition.',
  },
  {
    id: 'squat-single-leg',
    supportedUnits: ['reps', 'seconds'],
    name: 'Single-leg squat',
    description:
      'Balance on one leg and squat only as far as you can control. Use a sturdy support if needed, then press through the planted foot to stand. Choose a side for the interval.',
  },
  {
    id: 'squat-split',
    supportedUnits: ['reps', 'seconds'],
    name: 'Split squat',
    description:
      'Keep a staggered stance with your rear heel lifted. Bend both knees to lower vertically, then rise without stepping. Choose a front leg for the interval.',
  },
  {
    id: 'squat-bulgarian',
    supportedUnits: ['reps', 'seconds'],
    name: 'Bulgarian split squat',
    description:
      'Rest your rear foot on a stable low bench. Lower by bending your front knee, then push through your front foot to rise. Choose a front leg for the interval.',
  },
  {
    id: 'rowing-machine',
    supportedUnits: ['seconds', 'metres', 'calories'],
    name: 'Rowing machine',
    description:
      'Push with your legs, hinge back slightly, then pull the handle toward your lower ribs. Return arms first, then hinge forward and bend your knees. Keep your wrists relaxed.',
  },
  {
    id: 'glute-bridge',
    name: 'Glute bridge',
    description:
      'Lie on your back with knees bent and feet planted. Lift your hips by pressing through your feet, then lower with control. Keep the ribs down.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'mountain-climber',
    name: 'Mountain climber',
    description:
      'From a high plank, bring one knee toward your chest, return it, then alternate. Keep the trunk steady. Count each knee drive as one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dead-bug',
    name: 'Dead bug',
    description:
      'Lie on your back with arms up and hips and knees bent. Extend an opposite arm and leg within a controlled range, return, then alternate. Count each extension as one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'bird-dog',
    name: 'Bird dog',
    description:
      'From hands and knees, reach an opposite arm and leg away without twisting your trunk. Return with control and alternate. Count each reach as one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'hollow-body-hold',
    name: 'Hollow-body hold',
    description:
      'Lie on your back and brace your trunk, lifting shoulders and legs slightly. Keep your lower back supported against the floor; bend your knees to reduce the lever. Breathe throughout.',
    supportedUnits: ['seconds'],
  },
  {
    id: 'superman-hold',
    name: 'Superman hold',
    description:
      'Lie face down and gently lift your arms and legs a short distance. Keep your neck aligned and avoid forcing your lower back into a large arch. Breathe steadily.',
    supportedUnits: ['seconds'],
  },
  {
    id: 'standing-calf-raise',
    name: 'Standing calf raise',
    description:
      'Stand tall on a level floor. Rise onto the balls of both feet, pause briefly, then lower your heels with control. Use a comfortable range.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'inchworm-walkout',
    name: 'Inchworm walkout',
    description:
      'Hinge forward, bend your knees as needed and walk your hands into a high plank. Walk them back and stand. One full walkout and return counts as one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-goblet-squat',
    name: 'Dumbbell goblet squat',
    description:
      'Hold one dumbbell securely at your chest with both hands. Squat through a comfortable range with heels grounded, then stand tall.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-reverse-lunge',
    name: 'Dumbbell reverse lunge',
    description:
      'Hold one dumbbell at your chest. Step back into a lunge, return to standing and alternate legs. Count each lunge as one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'Dumbbell Romanian deadlift',
    description:
      'Hold one dumbbell in both hands in front of your thighs. With soft knees, move your hips back and lower the weight close to your legs. Stand by extending your hips.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-single-arm-row',
    name: 'Dumbbell single-arm row',
    description:
      'Hold one dumbbell and hinge with a staggered stance, resting the free hand on your thigh. Pull the weight toward your hip, then lower. Choose one side for the interval; targets are per side.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-floor-press',
    name: 'Dumbbell floor press',
    description:
      'Lie on the floor with knees bent and one dumbbell above your chest. Lower until the upper arm gently meets the floor, then press. Choose one side for the interval; targets are per side.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-strict-press',
    name: 'Dumbbell strict press',
    description:
      'Stand with one dumbbell at your shoulder. Brace and press overhead without using your legs, then lower with control. Choose one side for the interval; targets are per side.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-push-press',
    name: 'Dumbbell push press',
    description:
      'Hold one dumbbell at your shoulder. Dip through your knees, drive upward and finish pressing overhead. Lower under control. Choose one side for the interval; targets are per side.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'dumbbell-thruster',
    name: 'Dumbbell thruster',
    description:
      'Hold one dumbbell at a shoulder. Squat, then stand and use that drive to press overhead. Return to the shoulder before repeating. Choose one side for the interval; targets are per side.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'box-step-up',
    name: 'Box step-up',
    description:
      'Use a stable platform suited to your ability. Place one whole foot on top, step up to stand, then step down under control. Alternate the leading leg; each ascent is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'box-jump',
    name: 'Box jump',
    description:
      'Use a stable jump-rated box of a manageable height. Jump up with both feet, land softly with feet fully supported, then stand and step down. Each ascent is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    description:
      'Hang from a secure overhead bar. Pull until your chin clears it without swinging, then lower with control. Use a range and variation appropriate to your ability.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'medicine-ball-slam',
    name: 'Medicine-ball slam',
    description:
      'Use a non-bouncing ball rated for slams and a suitable clear floor area. Lift the ball overhead, then drive it down. Bend through hips and knees to retrieve it; each slam is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'reverse-crunch',
    name: 'Reverse crunch',
    description:
      'Lie on your back with knees bent. Curl your pelvis to bring the knees toward your chest, then lower slowly without swinging. Each controlled curl is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'bicycle-crunch',
    name: 'Bicycle crunch',
    description:
      'Lie on your back, lightly supporting your head. Turn your torso toward the opposite bent knee while extending the other leg. Alternate sides; each side counts as one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'supine-heel-reach',
    name: 'Supine lateral heel reach',
    description:
      'Lie on your back with knees bent and feet down. Lift your shoulders slightly and reach toward one heel, then the other. Keep the neck relaxed; each side is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'seated-knee-tuck',
    name: 'Seated knee tuck',
    description:
      'Sit on the floor with hands beside your hips. Lean back slightly, draw your bent knees toward your chest, then extend them within a controlled range. One tuck and extension is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'flutter-kicks',
    name: 'Flutter kicks',
    description:
      'Lie on your back and brace your trunk. Alternate small up-and-down leg movements without arching your lower back. Bend your knees or raise your legs to scale. Use a time target.',
    supportedUnits: ['seconds'],
  },
  {
    id: 'lying-leg-raise',
    name: 'Lying leg raise',
    description:
      'Lie on your back with legs together. Raise and lower them slowly within a range that keeps your lower back controlled. Bend the knees to scale. Each raise and lower is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'single-leg-glute-bridge',
    name: 'Single-leg glute bridge',
    description:
      'Lie on your back with one foot planted and the other leg lifted. Press through the planted foot to lift your hips, then lower. Reps apply to the working side; switch sides between sets.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'glute-bridge-march',
    name: 'Glute bridge march',
    description:
      'Lift your hips into a bridge with both feet planted. Keeping the pelvis steady, lift one foot briefly, replace it, and alternate. Each foot lift is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'bodyweight-lateral-lunge',
    name: 'Bodyweight lateral lunge',
    description:
      'Step sideways and bend that knee while sending your hips back; keep the other leg long. Push back to standing and alternate sides. Each side counts as one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'forward-lunge',
    name: 'Forward lunge',
    description:
      'Step forward and bend both knees through a comfortable range. Push through the front foot to return to standing, then alternate legs. Each forward step and return is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'bodyweight-good-morning',
    name: 'Bodyweight good morning',
    description:
      'Stand with soft knees and hands across your chest. Hinge at the hips, sending them back while keeping your back controlled, then stand tall. Each hinge and return is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'side-lying-leg-raise',
    name: 'Side-lying leg raise',
    description:
      'Lie on your side with legs long and hips stacked. Lift the upper leg without rolling the pelvis, then lower slowly. Reps apply to that side; switch sides between sets.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'unbanded-clamshell',
    name: 'Unbanded clamshell',
    description:
      'Lie on your side with hips and knees bent and feet together. Keep the pelvis stacked as you open the upper knee, then close it. Reps apply to that side; switch sides between sets.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'quadruped-donkey-kick',
    name: 'Quadruped donkey kick',
    description:
      'On hands and knees, keep one knee bent and lift that thigh behind you without arching your back. Lower with control. Reps apply to that side; switch sides between sets.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'fire-hydrant',
    name: 'Fire hydrant',
    description:
      'On hands and knees, lift one bent knee out to the side while keeping your trunk steady, then lower. Reps apply to that side; switch sides between sets.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'bear-crawl',
    name: 'Bear crawl',
    description:
      'Start on hands and toes with bent knees hovering near the floor. Take small opposite-hand-and-foot steps while keeping hips steady. Use a time target and clear floor space.',
    supportedUnits: ['seconds'],
  },
  {
    id: 'crab-walk',
    name: 'Crab walk',
    description:
      'Sit with feet planted and hands behind you. Lift your hips and take small hand-and-foot steps through a comfortable shoulder range. Use a time target and clear floor space.',
    supportedUnits: ['seconds'],
  },
  {
    id: 'standing-knee-drive',
    name: 'Standing alternating knee drive',
    description:
      'Stand tall and lift one knee toward waist height, then lower and alternate. Keep the supporting foot on the floor; each knee lift is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'step-jack',
    name: 'Step jack',
    description:
      'Step one foot out as you raise your arms, then bring it back as you lower them. Alternate sides without jumping. Each step out and return is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'jumping-jack',
    name: 'Jumping jack',
    description:
      'Jump your feet apart as your arms rise, then jump them together as your arms lower. Land softly. One out-and-back cycle is one rep; choose step jacks for a no-jump option.',
    supportedUnits: ['reps', 'seconds'],
  },
  {
    id: 'abdominal-crunch',
    name: 'Abdominal crunch',
    description:
      'Lie with knees bent and feet down. Curl your shoulders off the floor without pulling your neck, then lower. Each curl and return is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'bodyweight-russian-twist',
    name: 'Bodyweight Russian twist',
    description:
      'Sit with knees bent and feet on the floor. Lean back slightly and turn your trunk side to side with hands together. Each turn to one side is one rep; alternate sides.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'v-up',
    name: 'V-up',
    description:
      'Lie long, then lift your legs and upper body together, reaching toward your feet. Lower with control; bend your knees to scale. One lift and return is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'hollow-body-rock',
    name: 'Hollow-body rock',
    description:
      'Hold a hollow shape with shoulders and legs raised and lower back rounded toward the floor. Rock gently without losing that shape. One forward-and-back rock is one rep; tuck knees to scale.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'side-plank-hip-lift',
    name: 'Side-plank hip lift',
    description:
      'Support yourself on one forearm and the sides of your feet. Lower your hips a little, then lift into a straight side plank. One lower-and-lift is one rep on that side; switch sides between sets.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'side-plank-reach-through',
    name: 'Side-plank reach-through',
    description:
      'From a forearm side plank, reach your upper arm under your torso, then open it toward the ceiling. Keep hips lifted. One reach and return is one rep on that side; switch sides between sets.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'high-plank-shoulder-tap',
    name: 'High-plank shoulder tap',
    description:
      'From a high plank with feet apart, tap one hand to the opposite shoulder and replace it. Keep hips steady and alternate hands. Each tap and return is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'reverse-plank-hold',
    name: 'Reverse-plank hold',
    description:
      'Sit with legs straight and hands behind your hips. Press through hands and heels to lift hips into a long line. Keep your neck comfortable and breathe. Use a seconds target.',
    supportedUnits: ['seconds'],
  },

  {
    id: 'bear-plank-hold',
    name: 'Bear-plank hold',
    description:
      'Start on hands and knees, wrists under shoulders and knees under hips. Tuck toes and hover bent knees just off the floor. Keep your back steady and breathe. Use a seconds target.',
    supportedUnits: ['seconds'],
  },

  {
    id: 'standing-cross-body-crunch',
    name: 'Standing cross-body crunch',
    description:
      'Stand tall, then bring one knee toward the opposite elbow with a controlled trunk turn. Return and alternate. Each knee-to-elbow lift is one rep; avoid pulling on your head.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'squat-thrust',
    name: 'Squat thrust',
    description:
      'Squat and place hands on the floor. Step or jump feet back to a high plank, bring them forward, then stand. No push-up or vertical jump. That full sequence is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'burpee-broad-jump',
    name: 'Burpee broad jump',
    description:
      'Lower chest to the floor from a plank, return feet toward your hands, then jump forward from both feet and land softly. Clear floor space first. One burpee plus forward jump is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'skater-bound',
    name: 'Skater bound',
    description:
      'Bound sideways from one foot to the other, letting the trailing leg move behind you. Use your arms for balance and land softly with a bent knee. Each sideways landing is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'high-knees-running',
    name: 'High-knees running in place',
    description:
      'Run in place, lifting alternating knees toward a comfortable height while pumping your arms. Land softly under your body. Each knee lift is one rep; reduce pace or march to scale.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'inchworm-pushup',
    name: 'Inchworm with push-up',
    description:
      'From standing, bend forward and walk hands to a high plank. Do one push-up, walk hands back, then stand. Bend knees as needed. The full walkout, push-up and return is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'kettlebell-turkish-getup',
    name: 'Kettlebell Turkish get-up',
    description:
      'With one light kettlebell held above you, move from lying through elbow, hand and half-kneeling to standing; reverse slowly. One up-and-down sequence is one rep on that side. Practise the sequence unloaded first; never rush.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'kettlebell-clean-press',
    name: 'Kettlebell clean and press',
    description:
      'Clean one kettlebell to the rack, press overhead without a knee dip, then lower through the rack to reset. One clean, press and return is one rep on that arm; switch arms between sets.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'alternating-dumbbell-snatch',
    name: 'Alternating dumbbell snatch',
    description:
      'Lift one dumbbell from the floor to overhead in one motion using hip and leg drive. Lower with control and switch hands at the floor. Each floor-to-overhead lift is one rep; alternate arms.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'dumbbell-devil-press',
    name: 'Dumbbell devil press',
    description:
      'Use two non-rolling dumbbells. Lower chest between them for a burpee, return feet forward, then hinge and drive both weights overhead without racking. Lower under control. One burpee and overhead lift is one rep.',
    supportedUnits: ['reps', 'seconds'],
  },

  {
    id: 'dumbbell-man-maker',
    name: 'Dumbbell man maker',
    description:
      'Use two non-rolling dumbbells. From plank, do a push-up and one row per arm. Bring feet forward into a squat, curl weights to shoulders, then stand and press overhead. Lower to reset. The entire sequence is one rep; use light weights.',
    supportedUnits: ['reps', 'seconds'],
  },
];
export async function listExercises() {
  return exercises;
}
