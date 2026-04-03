---
title: "essentia/src/examples/python/example_tonal_key_by_steps_streaming.py at master"
source: "https://github.com/MTG/essentia/blob/master/src/examples/python/example_tonal_key_by_steps_streaming.py"
author:
published:
created: 2026-04-02
description: "C++ library for audio and music analysis, description and synthesis, including Python bindings - essentia/src/examples/python/example_tonal_key_by_steps_streaming.py at master · MTG/essentia"
tags:
  - "clippings"
---
1

2

3

4

5

6

7

8

9

10

11

12

13

14

15

16

17

18

19

20

21

22

23

24

25

26

27

28

29

30

31

32

33

34

35

36

37

38

39

40

41

42

43

44

45

46

import sys

import essentia

from essentia.streaming import \*

from essentia.standard import YamlOutput

try:

infile = sys.argv\[1\]

outfile = sys.argv\[2\]

except:

print("usage: %s <input audio file> <output json file>" % sys.argv\[0\])

sys.exit()

\# initialize algorithms we will use

loader = MonoLoader(filename=infile)

framecutter = FrameCutter()

windowing = Windowing(type="blackmanharris62")

spectrum = Spectrum()

spectralpeaks = SpectralPeaks(orderBy="magnitude",

magnitudeThreshold=1e-05,

minFrequency=40,

maxFrequency=5000,

maxPeaks=10000)

hpcp = HPCP()

key = Key()

\# use pool to store data

pool = essentia.Pool()

\# connect algorithms together

loader.audio >> framecutter.signal

framecutter.frame >> windowing.frame >> spectrum.frame

spectrum.spectrum >> spectralpeaks.spectrum

spectralpeaks.magnitudes >> hpcp.magnitudes

spectralpeaks.frequencies >> hpcp.frequencies

hpcp.hpcp >> key.pcp

key.key >> (pool, 'tonal.key\_key')

key.scale >> (pool, 'tonal.key\_scale')

key.strength >> (pool, 'tonal.key\_strength')

\# network is ready, run it

essentia.run(loader)

print(pool\['tonal.key\_key'\] + " " + pool\['tonal.key\_scale'\])

\# write to json file

YamlOutput(filename=outfile, format="json")(pool)