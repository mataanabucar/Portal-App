
==============================
FILTER: abench
==============================
Filter abench
  Benchmark part of a filtergraph.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
abench AVOptions:
   action            <int>        ..F.A...... set action (from 0 to 1) (default start)
     start           0            ..F.A...... start timer
     stop            1            ..F.A...... stop timer


Exiting with exit code 0

==============================
FILTER: acompressor
==============================
Filter acompressor
  Audio compressor.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
acompressor/sidechaincompress AVOptions:
   level_in          <double>     ..F.A....T. set input gain (from 0.015625 to 64) (default 1)
   mode              <int>        ..F.A....T. set mode (from 0 to 1) (default downward)
     downward        0            ..F.A....T.
     upward          1            ..F.A....T.
   threshold         <double>     ..F.A....T. set threshold (from 0.000976563 to 1) (default 0.125)
   ratio             <double>     ..F.A....T. set ratio (from 1 to 20) (default 2)
   attack            <double>     ..F.A....T. set attack (from 0.01 to 2000) (default 20)
   release           <double>     ..F.A....T. set release (from 0.01 to 9000) (default 250)
   makeup            <double>     ..F.A....T. set make up gain (from 1 to 64) (default 1)
   knee              <double>     ..F.A....T. set knee (from 1 to 8) (default 2.82843)
   link              <int>        ..F.A....T. set link type (from 0 to 1) (default average)
     average         0            ..F.A....T.
     maximum         1            ..F.A....T.
   detection         <int>        ..F.A....T. set detection (from 0 to 1) (default rms)
     peak            0            ..F.A....T.
     rms             1            ..F.A....T.
   level_sc          <double>     ..F.A....T. set sidechain gain (from 0.015625 to 64) (default 1)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)


Exiting with exit code 0

==============================
FILTER: acontrast
==============================
Filter acontrast
  Simple audio dynamic range compression/expansion filter.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
acontrast AVOptions:
   contrast          <float>      ..F.A...... set contrast (from 0 to 100) (default 33)


Exiting with exit code 0

==============================
FILTER: acopy
==============================
Filter acopy
  Copy the input audio unchanged to the output.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)

Exiting with exit code 0

==============================
FILTER: acue
==============================
Filter acue
  Delay filtering to match a cue.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
(a)cue AVOptions:
   cue               <int64>      ..FVA...... cue unix timestamp in microseconds (from 0 to I64_MAX) (default 0)
   preroll           <duration>   ..FVA...... preroll duration in seconds (default 0)
   buffer            <duration>   ..FVA...... buffer duration in seconds (default 0)


Exiting with exit code 0

==============================
FILTER: acrossfade
==============================
Filter acrossfade
  Cross fade two input audio streams.
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
acrossfade AVOptions:
   inputs            <int>        ..F.A...... set number of input files to cross fade (from 1 to INT_MAX) (default 2)
   n                 <int>        ..F.A...... set number of input files to cross fade (from 1 to INT_MAX) (default 2)
   nb_samples        <int64>      ..F.A...... set number of samples for cross fade duration (from 1 to 2.14748e+08) (default 44100)
   ns                <int64>      ..F.A...... set number of samples for cross fade duration (from 1 to 2.14748e+08) (default 44100)
   duration          <duration>   ..F.A...... set cross fade duration (default 0)
   d                 <duration>   ..F.A...... set cross fade duration (default 0)
   overlap           <boolean>    ..F.A...... overlap 1st stream end with 2nd stream start (default true)
   o                 <boolean>    ..F.A...... overlap 1st stream end with 2nd stream start (default true)
   curve1            <int>        ..F.A...... set fade curve type for 1st stream (from -1 to 22) (default tri)
     nofade          -1           ..F.A...... no fade; keep audio as-is
     tri             0            ..F.A...... linear slope
     qsin            1            ..F.A...... quarter of sine wave
     esin            2            ..F.A...... exponential sine wave
     hsin            3            ..F.A...... half of sine wave
     log             4            ..F.A...... logarithmic
     ipar            5            ..F.A...... inverted parabola
     qua             6            ..F.A...... quadratic
     cub             7            ..F.A...... cubic
     squ             8            ..F.A...... square root
     cbr             9            ..F.A...... cubic root
     par             10           ..F.A...... parabola
     exp             11           ..F.A...... exponential
     iqsin           12           ..F.A...... inverted quarter of sine wave
     ihsin           13           ..F.A...... inverted half of sine wave
     dese            14           ..F.A...... double-exponential seat
     desi            15           ..F.A...... double-exponential sigmoid
     losi            16           ..F.A...... logistic sigmoid
     sinc            17           ..F.A...... sine cardinal function
     isinc           18           ..F.A...... inverted sine cardinal function
     quat            19           ..F.A...... quartic
     quatr           20           ..F.A...... quartic root
     qsin2           21           ..F.A...... squared quarter of sine wave
     hsin2           22           ..F.A...... squared half of sine wave
   c1                <int>        ..F.A...... set fade curve type for 1st stream (from -1 to 22) (default tri)
     nofade          -1           ..F.A...... no fade; keep audio as-is
     tri             0            ..F.A...... linear slope
     qsin            1            ..F.A...... quarter of sine wave
     esin            2            ..F.A...... exponential sine wave
     hsin            3            ..F.A...... half of sine wave
     log             4            ..F.A...... logarithmic
     ipar            5            ..F.A...... inverted parabola
     qua             6            ..F.A...... quadratic
     cub             7            ..F.A...... cubic
     squ             8            ..F.A...... square root
     cbr             9            ..F.A...... cubic root
     par             10           ..F.A...... parabola
     exp             11           ..F.A...... exponential
     iqsin           12           ..F.A...... inverted quarter of sine wave
     ihsin           13           ..F.A...... inverted half of sine wave
     dese            14           ..F.A...... double-exponential seat
     desi            15           ..F.A...... double-exponential sigmoid
     losi            16           ..F.A...... logistic sigmoid
     sinc            17           ..F.A...... sine cardinal function
     isinc           18           ..F.A...... inverted sine cardinal function
     quat            19           ..F.A...... quartic
     quatr           20           ..F.A...... quartic root
     qsin2           21           ..F.A...... squared quarter of sine wave
     hsin2           22           ..F.A...... squared half of sine wave
   curve2            <int>        ..F.A...... set fade curve type for 2nd stream (from -1 to 22) (default tri)
     nofade          -1           ..F.A...... no fade; keep audio as-is
     tri             0            ..F.A...... linear slope
     qsin            1            ..F.A...... quarter of sine wave
     esin            2            ..F.A...... exponential sine wave
     hsin            3            ..F.A...... half of sine wave
     log             4            ..F.A...... logarithmic
     ipar            5            ..F.A...... inverted parabola
     qua             6            ..F.A...... quadratic
     cub             7            ..F.A...... cubic
     squ             8            ..F.A...... square root
     cbr             9            ..F.A...... cubic root
     par             10           ..F.A...... parabola
     exp             11           ..F.A...... exponential
     iqsin           12           ..F.A...... inverted quarter of sine wave
     ihsin           13           ..F.A...... inverted half of sine wave
     dese            14           ..F.A...... double-exponential seat
     desi            15           ..F.A...... double-exponential sigmoid
     losi            16           ..F.A...... logistic sigmoid
     sinc            17           ..F.A...... sine cardinal function
     isinc           18           ..F.A...... inverted sine cardinal function
     quat            19           ..F.A...... quartic
     quatr           20           ..F.A...... quartic root
     qsin2           21           ..F.A...... squared quarter of sine wave
     hsin2           22           ..F.A...... squared half of sine wave
   c2                <int>        ..F.A...... set fade curve type for 2nd stream (from -1 to 22) (default tri)
     nofade          -1           ..F.A...... no fade; keep audio as-is
     tri             0            ..F.A...... linear slope
     qsin            1            ..F.A...... quarter of sine wave
     esin            2            ..F.A...... exponential sine wave
     hsin            3            ..F.A...... half of sine wave
     log             4            ..F.A...... logarithmic
     ipar            5            ..F.A...... inverted parabola
     qua             6            ..F.A...... quadratic
     cub             7            ..F.A...... cubic
     squ             8            ..F.A...... square root
     cbr             9            ..F.A...... cubic root
     par             10           ..F.A...... parabola
     exp             11           ..F.A...... exponential
     iqsin           12           ..F.A...... inverted quarter of sine wave
     ihsin           13           ..F.A...... inverted half of sine wave
     dese            14           ..F.A...... double-exponential seat
     desi            15           ..F.A...... double-exponential sigmoid
     losi            16           ..F.A...... logistic sigmoid
     sinc            17           ..F.A...... sine cardinal function
     isinc           18           ..F.A...... inverted sine cardinal function
     quat            19           ..F.A...... quartic
     quatr           20           ..F.A...... quartic root
     qsin2           21           ..F.A...... squared quarter of sine wave
     hsin2           22           ..F.A...... squared half of sine wave


Exiting with exit code 0

==============================
FILTER: acrossover
==============================
Filter acrossover
  Split audio into per-bands streams.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
acrossover AVOptions:
   split             <string>     ..F.A...... set split frequencies (default "500")
   order             <int>        ..F.A...... set filter order (from 0 to 9) (default 4th)
     2nd             0            ..F.A...... 2nd order (12 dB/8ve)
     4th             1            ..F.A...... 4th order (24 dB/8ve)
     6th             2            ..F.A...... 6th order (36 dB/8ve)
     8th             3            ..F.A...... 8th order (48 dB/8ve)
     10th            4            ..F.A...... 10th order (60 dB/8ve)
     12th            5            ..F.A...... 12th order (72 dB/8ve)
     14th            6            ..F.A...... 14th order (84 dB/8ve)
     16th            7            ..F.A...... 16th order (96 dB/8ve)
     18th            8            ..F.A...... 18th order (108 dB/8ve)
     20th            9            ..F.A...... 20th order (120 dB/8ve)
   level             <float>      ..F.A...... set input gain (from 0 to 1) (default 1)
   gain              <string>     ..F.A...... set output bands gain (default "1.f")
   precision         <int>        ..F.A...... set processing precision (from 0 to 2) (default auto)
     auto            0            ..F.A...... set auto processing precision
     float           1            ..F.A...... set single-floating point processing precision
     double          2            ..F.A...... set double-floating point processing precision


Exiting with exit code 0

==============================
FILTER: acrusher
==============================
Filter acrusher
  Reduce audio bit resolution.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
acrusher AVOptions:
   level_in          <double>     ..F.A....T. set level in (from 0.015625 to 64) (default 1)
   level_out         <double>     ..F.A....T. set level out (from 0.015625 to 64) (default 1)
   bits              <double>     ..F.A....T. set bit reduction (from 1 to 64) (default 8)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 0.5)
   mode              <int>        ..F.A....T. set mode (from 0 to 1) (default lin)
     lin             0            ..F.A....T. linear
     log             1            ..F.A....T. logarithmic
   dc                <double>     ..F.A....T. set DC (from 0.25 to 4) (default 1)
   aa                <double>     ..F.A....T. set anti-aliasing (from 0 to 1) (default 0.5)
   samples           <double>     ..F.A....T. set sample reduction (from 1 to 250) (default 1)
   lfo               <boolean>    ..F.A....T. enable LFO (default false)
   lforange          <double>     ..F.A....T. set LFO depth (from 1 to 250) (default 20)
   lforate           <double>     ..F.A....T. set LFO rate (from 0.01 to 200) (default 0.3)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adeclick
==============================
Filter adeclick
  Remove impulsive noise from input audio.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adeclick AVOptions:
   window            <double>     ..F.A...... set window size (from 10 to 100) (default 55)
   w                 <double>     ..F.A...... set window size (from 10 to 100) (default 55)
   overlap           <double>     ..F.A...... set window overlap (from 50 to 95) (default 75)
   o                 <double>     ..F.A...... set window overlap (from 50 to 95) (default 75)
   arorder           <double>     ..F.A...... set autoregression order (from 0 to 25) (default 2)
   a                 <double>     ..F.A...... set autoregression order (from 0 to 25) (default 2)
   threshold         <double>     ..F.A...... set threshold (from 1 to 100) (default 2)
   t                 <double>     ..F.A...... set threshold (from 1 to 100) (default 2)
   burst             <double>     ..F.A...... set burst fusion (from 0 to 10) (default 2)
   b                 <double>     ..F.A...... set burst fusion (from 0 to 10) (default 2)
   method            <int>        ..F.A...... set overlap method (from 0 to 1) (default add)
     add             0            ..F.A...... overlap-add
     a               0            ..F.A...... overlap-add
     save            1            ..F.A...... overlap-save
     s               1            ..F.A...... overlap-save
   m                 <int>        ..F.A...... set overlap method (from 0 to 1) (default add)
     add             0            ..F.A...... overlap-add
     a               0            ..F.A...... overlap-add
     save            1            ..F.A...... overlap-save
     s               1            ..F.A...... overlap-save

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adeclip
==============================
Filter adeclip
  Remove clipping from input audio.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adeclip AVOptions:
   window            <double>     ..F.A...... set window size (from 10 to 100) (default 55)
   w                 <double>     ..F.A...... set window size (from 10 to 100) (default 55)
   overlap           <double>     ..F.A...... set window overlap (from 50 to 95) (default 75)
   o                 <double>     ..F.A...... set window overlap (from 50 to 95) (default 75)
   arorder           <double>     ..F.A...... set autoregression order (from 0 to 25) (default 8)
   a                 <double>     ..F.A...... set autoregression order (from 0 to 25) (default 8)
   threshold         <double>     ..F.A...... set threshold (from 1 to 100) (default 10)
   t                 <double>     ..F.A...... set threshold (from 1 to 100) (default 10)
   hsize             <int>        ..F.A...... set histogram size (from 100 to 9999) (default 1000)
   n                 <int>        ..F.A...... set histogram size (from 100 to 9999) (default 1000)
   method            <int>        ..F.A...... set overlap method (from 0 to 1) (default add)
     add             0            ..F.A...... overlap-add
     a               0            ..F.A...... overlap-add
     save            1            ..F.A...... overlap-save
     s               1            ..F.A...... overlap-save
   m                 <int>        ..F.A...... set overlap method (from 0 to 1) (default add)
     add             0            ..F.A...... overlap-add
     a               0            ..F.A...... overlap-add
     save            1            ..F.A...... overlap-save
     s               1            ..F.A...... overlap-save

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adecorrelate
==============================
Filter adecorrelate
  Apply decorrelation to input audio.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adecorrelate AVOptions:
   stages            <int>        ..F.A...... set filtering stages (from 1 to 16) (default 6)
   seed              <int64>      ..F.A...... set random seed (from -1 to UINT32_MAX) (default -1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adelay
==============================
Filter adelay
  Delay one or more audio channels.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adelay AVOptions:
   delays            <string>     ..F.A....T. set list of delays for each channel
   all               <boolean>    ..F.A...... use last available delay for remained channels (default false)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adenorm
==============================
Filter adenorm
  Remedy denormals by adding extremely low-level noise.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adenorm AVOptions:
   level             <double>     ..F.A....T. set level (from -451 to -90) (default -351)
   type              <int>        ..F.A....T. set type (from 0 to 3) (default dc)
     dc              0            ..F.A....T.
     ac              1            ..F.A....T.
     square          2            ..F.A....T.
     pulse           3            ..F.A....T.

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aderivative
==============================
Filter aderivative
  Compute derivative of input audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aderivative/aintegral AVOptions:

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adrc
==============================
Filter adrc
  Audio Spectral Dynamic Range Controller.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adrc AVOptions:
   transfer          <string>     ..F.A....T. set the transfer expression (default "p")
   attack            <double>     ..F.A....T. set the attack (from 1 to 1000) (default 50)
   release           <double>     ..F.A....T. set the release (from 5 to 2000) (default 100)
   channels          <string>     ..F.A....T. set channels to filter (default "all")

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adynamicequalizer
==============================
Filter adynamicequalizer
  Apply Dynamic Equalization of input audio.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adynamicequalizer AVOptions:
   threshold         <double>     ..F.A....T. set detection threshold (from 0 to 100) (default 0)
   dfrequency        <double>     ..F.A....T. set detection frequency (from 2 to 1e+06) (default 1000)
   dqfactor          <double>     ..F.A....T. set detection Q factor (from 0.001 to 1000) (default 1)
   tfrequency        <double>     ..F.A....T. set target frequency (from 2 to 1e+06) (default 1000)
   tqfactor          <double>     ..F.A....T. set target Q factor (from 0.001 to 1000) (default 1)
   attack            <double>     ..F.A....T. set detection attack duration (from 0.01 to 2000) (default 20)
   release           <double>     ..F.A....T. set detection release duration (from 0.01 to 2000) (default 200)
   ratio             <double>     ..F.A....T. set ratio factor (from 0 to 30) (default 1)
   makeup            <double>     ..F.A....T. set makeup gain (from 0 to 1000) (default 0)
   range             <double>     ..F.A....T. set max gain (from 1 to 2000) (default 50)
   mode              <int>        ..F.A....T. set mode (from -1 to 3) (default cutbelow)
     listen          -1           ..F.A....T.
     cutbelow        0            ..F.A....T.
     cutabove        1            ..F.A....T.
     boostbelow      2            ..F.A....T.
     boostabove      3            ..F.A....T.
   dftype            <int>        ..F.A....T. set detection filter type (from 0 to 3) (default bandpass)
     bandpass        0            ..F.A....T.
     lowpass         1            ..F.A....T.
     highpass        2            ..F.A....T.
     peak            3            ..F.A....T.
   tftype            <int>        ..F.A....T. set target filter type (from 0 to 2) (default bell)
     bell            0            ..F.A....T.
     lowshelf        1            ..F.A....T.
     highshelf       2            ..F.A....T.
   auto              <int>        ..F.A....T. set auto threshold (from 1 to 4) (default off)
     disabled        1            ..F.A....T.
     off             2            ..F.A....T.
     on              3            ..F.A....T.
     adaptive        4            ..F.A....T.
   precision         <int>        ..F.A...... set processing precision (from 0 to 2) (default auto)
     auto            0            ..F.A...... set auto processing precision
     float           1            ..F.A...... set single-floating point processing precision
     double          2            ..F.A...... set double-floating point processing precision

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: adynamicsmooth
==============================
Filter adynamicsmooth
  Apply Dynamic Smoothing of input audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
adynamicsmooth AVOptions:
   sensitivity       <double>     ..F.A....T. set smooth sensitivity (from 0 to 1e+06) (default 2)
   basefreq          <double>     ..F.A....T. set base frequency (from 2 to 1e+06) (default 22050)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aecho
==============================
Filter aecho
  Add echoing to the audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aecho AVOptions:
   in_gain           <float>      ..F.A...... set signal input gain (from 0 to 1) (default 0.6)
   out_gain          <float>      ..F.A...... set signal output gain (from 0 to 1) (default 0.3)
   delays            <string>     ..F.A...... set list of signal delays (default "1000")
   decays            <string>     ..F.A...... set list of signal decays (default "0.5")


Exiting with exit code 0

==============================
FILTER: aemphasis
==============================
Filter aemphasis
  Audio emphasis.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aemphasis AVOptions:
   level_in          <double>     ..F.A....T. set input gain (from 0 to 64) (default 1)
   level_out         <double>     ..F.A....T. set output gain (from 0 to 64) (default 1)
   mode              <int>        ..F.A....T. set filter mode (from 0 to 1) (default reproduction)
     reproduction    0            ..F.A....T.
     production      1            ..F.A....T.
   type              <int>        ..F.A....T. set filter type (from 0 to 8) (default cd)
     col             0            ..F.A....T. Columbia
     emi             1            ..F.A....T. EMI
     bsi             2            ..F.A....T. BSI (78RPM)
     riaa            3            ..F.A....T. RIAA
     cd              4            ..F.A....T. Compact Disc (CD)
     50fm            5            ..F.A....T. 50┬╡s (FM)
     75fm            6            ..F.A....T. 75┬╡s (FM)
     50kf            7            ..F.A....T. 50┬╡s (FM-KF)
     75kf            8            ..F.A....T. 75┬╡s (FM-KF)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aeval
==============================
Filter aeval
  Filter audio signal according to a specified expression.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aeval AVOptions:
   exprs             <string>     ..F.A...... set the '|'-separated list of channels expressions
   channel_layout    <string>     ..F.A...... set channel layout
   c                 <string>     ..F.A...... set channel layout

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aexciter
==============================
Filter aexciter
  Enhance high frequency part of audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aexciter AVOptions:
   level_in          <double>     ..F.A....T. set level in (from 0 to 64) (default 1)
   level_out         <double>     ..F.A....T. set level out (from 0 to 64) (default 1)
   amount            <double>     ..F.A....T. set amount (from 0 to 64) (default 1)
   drive             <double>     ..F.A....T. set harmonics (from 0.1 to 10) (default 8.5)
   blend             <double>     ..F.A....T. set blend harmonics (from -10 to 10) (default 0)
   freq              <double>     ..F.A....T. set scope (from 2000 to 12000) (default 7500)
   ceil              <double>     ..F.A....T. set ceiling (from 9999 to 20000) (default 9999)
   listen            <boolean>    ..F.A....T. enable listen mode (default false)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: afade
==============================
Filter afade
  Fade in/out input audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
afade AVOptions:
   type              <int>        ..F.A....T. set the fade direction (from 0 to 1) (default in)
     in              0            ..F.A....T. fade-in
     out             1            ..F.A....T. fade-out
   t                 <int>        ..F.A....T. set the fade direction (from 0 to 1) (default in)
     in              0            ..F.A....T. fade-in
     out             1            ..F.A....T. fade-out
   start_sample      <int64>      ..F.A....T. set number of first sample to start fading (from 0 to I64_MAX) (default 0)
   ss                <int64>      ..F.A....T. set number of first sample to start fading (from 0 to I64_MAX) (default 0)
   nb_samples        <int64>      ..F.A....T. set number of samples for fade duration (from 1 to I64_MAX) (default 44100)
   ns                <int64>      ..F.A....T. set number of samples for fade duration (from 1 to I64_MAX) (default 44100)
   start_time        <duration>   ..F.A....T. set time to start fading (default 0)
   st                <duration>   ..F.A....T. set time to start fading (default 0)
   duration          <duration>   ..F.A....T. set fade duration (default 0)
   d                 <duration>   ..F.A....T. set fade duration (default 0)
   curve             <int>        ..F.A....T. set fade curve type (from -1 to 22) (default tri)
     nofade          -1           ..F.A....T. no fade; keep audio as-is
     tri             0            ..F.A....T. linear slope
     qsin            1            ..F.A....T. quarter of sine wave
     esin            2            ..F.A....T. exponential sine wave
     hsin            3            ..F.A....T. half of sine wave
     log             4            ..F.A....T. logarithmic
     ipar            5            ..F.A....T. inverted parabola
     qua             6            ..F.A....T. quadratic
     cub             7            ..F.A....T. cubic
     squ             8            ..F.A....T. square root
     cbr             9            ..F.A....T. cubic root
     par             10           ..F.A....T. parabola
     exp             11           ..F.A....T. exponential
     iqsin           12           ..F.A....T. inverted quarter of sine wave
     ihsin           13           ..F.A....T. inverted half of sine wave
     dese            14           ..F.A....T. double-exponential seat
     desi            15           ..F.A....T. double-exponential sigmoid
     losi            16           ..F.A....T. logistic sigmoid
     sinc            17           ..F.A....T. sine cardinal function
     isinc           18           ..F.A....T. inverted sine cardinal function
     quat            19           ..F.A....T. quartic
     quatr           20           ..F.A....T. quartic root
     qsin2           21           ..F.A....T. squared quarter of sine wave
     hsin2           22           ..F.A....T. squared half of sine wave
   c                 <int>        ..F.A....T. set fade curve type (from -1 to 22) (default tri)
     nofade          -1           ..F.A....T. no fade; keep audio as-is
     tri             0            ..F.A....T. linear slope
     qsin            1            ..F.A....T. quarter of sine wave
     esin            2            ..F.A....T. exponential sine wave
     hsin            3            ..F.A....T. half of sine wave
     log             4            ..F.A....T. logarithmic
     ipar            5            ..F.A....T. inverted parabola
     qua             6            ..F.A....T. quadratic
     cub             7            ..F.A....T. cubic
     squ             8            ..F.A....T. square root
     cbr             9            ..F.A....T. cubic root
     par             10           ..F.A....T. parabola
     exp             11           ..F.A....T. exponential
     iqsin           12           ..F.A....T. inverted quarter of sine wave
     ihsin           13           ..F.A....T. inverted half of sine wave
     dese            14           ..F.A....T. double-exponential seat
     desi            15           ..F.A....T. double-exponential sigmoid
     losi            16           ..F.A....T. logistic sigmoid
     sinc            17           ..F.A....T. sine cardinal function
     isinc           18           ..F.A....T. inverted sine cardinal function
     quat            19           ..F.A....T. quartic
     quatr           20           ..F.A....T. quartic root
     qsin2           21           ..F.A....T. squared quarter of sine wave
     hsin2           22           ..F.A....T. squared half of sine wave
   silence           <double>     ..F.A....T. set the silence gain (from 0 to 1) (default 0)
   unity             <double>     ..F.A....T. set the unity gain (from 0 to 1) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: afftdn
==============================
Filter afftdn
  Denoise audio samples using FFT.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
afftdn AVOptions:
   noise_reduction   <float>      ..F.A....T. set the noise reduction (from 0.01 to 97) (default 12)
   nr                <float>      ..F.A....T. set the noise reduction (from 0.01 to 97) (default 12)
   noise_floor       <float>      ..F.A....T. set the noise floor (from -80 to -20) (default -50)
   nf                <float>      ..F.A....T. set the noise floor (from -80 to -20) (default -50)
   noise_type        <int>        ..F.A...... set the noise type (from 0 to 3) (default white)
     white           0            ..F.A...... white noise
     w               0            ..F.A...... white noise
     vinyl           1            ..F.A...... vinyl noise
     v               1            ..F.A...... vinyl noise
     shellac         2            ..F.A...... shellac noise
     s               2            ..F.A...... shellac noise
     custom          3            ..F.A...... custom noise
     c               3            ..F.A...... custom noise
   nt                <int>        ..F.A...... set the noise type (from 0 to 3) (default white)
     white           0            ..F.A...... white noise
     w               0            ..F.A...... white noise
     vinyl           1            ..F.A...... vinyl noise
     v               1            ..F.A...... vinyl noise
     shellac         2            ..F.A...... shellac noise
     s               2            ..F.A...... shellac noise
     custom          3            ..F.A...... custom noise
     c               3            ..F.A...... custom noise
   band_noise        <string>     ..F.A...... set the custom bands noise
   bn                <string>     ..F.A...... set the custom bands noise
   residual_floor    <float>      ..F.A....T. set the residual floor (from -80 to -20) (default -38)
   rf                <float>      ..F.A....T. set the residual floor (from -80 to -20) (default -38)
   track_noise       <boolean>    ..F.A....T. track noise (default false)
   tn                <boolean>    ..F.A....T. track noise (default false)
   track_residual    <boolean>    ..F.A....T. track residual (default false)
   tr                <boolean>    ..F.A....T. track residual (default false)
   output_mode       <int>        ..F.A....T. set output mode (from 0 to 2) (default output)
     input           0            ..F.A....T. input
     i               0            ..F.A....T. input
     output          1            ..F.A....T. output
     o               1            ..F.A....T. output
     noise           2            ..F.A....T. noise
     n               2            ..F.A....T. noise
   om                <int>        ..F.A....T. set output mode (from 0 to 2) (default output)
     input           0            ..F.A....T. input
     i               0            ..F.A....T. input
     output          1            ..F.A....T. output
     o               1            ..F.A....T. output
     noise           2            ..F.A....T. noise
     n               2            ..F.A....T. noise
   adaptivity        <float>      ..F.A....T. set adaptivity factor (from 0 to 1) (default 0.5)
   ad                <float>      ..F.A....T. set adaptivity factor (from 0 to 1) (default 0.5)
   floor_offset      <float>      ..F.A....T. set noise floor offset factor (from -2 to 2) (default 1)
   fo                <float>      ..F.A....T. set noise floor offset factor (from -2 to 2) (default 1)
   noise_link        <int>        ..F.A....T. set the noise floor link (from 0 to 3) (default min)
     none            0            ..F.A....T. none
     min             1            ..F.A....T. min
     max             2            ..F.A....T. max
     average         3            ..F.A....T. average
   nl                <int>        ..F.A....T. set the noise floor link (from 0 to 3) (default min)
     none            0            ..F.A....T. none
     min             1            ..F.A....T. min
     max             2            ..F.A....T. max
     average         3            ..F.A....T. average
   band_multiplier   <float>      ..F.A...... set band multiplier (from 0.2 to 5) (default 1.25)
   bm                <float>      ..F.A...... set band multiplier (from 0.2 to 5) (default 1.25)
   sample_noise      <int>        ..F.A....T. set sample noise mode (from 0 to 2) (default none)
     none            0            ..F.A....T. none
     start           1            ..F.A....T. start
     begin           1            ..F.A....T. start
     stop            2            ..F.A....T. stop
     end             2            ..F.A....T. stop
   sn                <int>        ..F.A....T. set sample noise mode (from 0 to 2) (default none)
     none            0            ..F.A....T. none
     start           1            ..F.A....T. start
     begin           1            ..F.A....T. start
     stop            2            ..F.A....T. stop
     end             2            ..F.A....T. stop
   gain_smooth       <int>        ..F.A....T. set gain smooth radius (from 0 to 50) (default 0)
   gs                <int>        ..F.A....T. set gain smooth radius (from 0 to 50) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: afftfilt
==============================
Filter afftfilt
  Apply arbitrary expressions to samples in frequency domain.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
afftfilt AVOptions:
   real              <string>     ..F.A...... set channels real expressions (default "re")
   imag              <string>     ..F.A...... set channels imaginary expressions (default "im")
   win_size          <int>        ..F.A...... set window size (from 16 to 131072) (default 4096)
   win_func          <int>        ..F.A...... set window function (from 0 to 20) (default hann)
     rect            0            ..F.A...... Rectangular
     bartlett        4            ..F.A...... Bartlett
     hann            1            ..F.A...... Hann
     hanning         1            ..F.A...... Hanning
     hamming         2            ..F.A...... Hamming
     blackman        3            ..F.A...... Blackman
     welch           5            ..F.A...... Welch
     flattop         6            ..F.A...... Flat-top
     bharris         7            ..F.A...... Blackman-Harris
     bnuttall        8            ..F.A...... Blackman-Nuttall
     bhann           11           ..F.A...... Bartlett-Hann
     sine            9            ..F.A...... Sine
     nuttall         10           ..F.A...... Nuttall
     lanczos         12           ..F.A...... Lanczos
     gauss           13           ..F.A...... Gauss
     tukey           14           ..F.A...... Tukey
     dolph           15           ..F.A...... Dolph-Chebyshev
     cauchy          16           ..F.A...... Cauchy
     parzen          17           ..F.A...... Parzen
     poisson         18           ..F.A...... Poisson
     bohman          19           ..F.A...... Bohman
     kaiser          20           ..F.A...... Kaiser
   overlap           <float>      ..F.A...... set window overlap (from 0 to 1) (default 0.75)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: afir
==============================
Filter afir
  Apply Finite Impulse Response filter with supplied coefficients in additional stream(s).
    slice threading supported
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
afir AVOptions:
   dry               <float>      ..F.A....T. set dry gain (from 0 to 10) (default 1)
   wet               <float>      ..F.A....T. set wet gain (from 0 to 10) (default 1)
   length            <float>      ..F.A...... set IR length (from 0 to 1) (default 1)
   gtype             <int>        ..F.A.....P set IR auto gain type (from -1 to 4) (default peak)
     none            -1           ..F.A.....P without auto gain
     peak            0            ..F.A.....P peak gain
     dc              1            ..F.A.....P DC gain
     gn              2            ..F.A.....P gain to noise
     ac              3            ..F.A.....P AC gain
     rms             4            ..F.A.....P RMS gain
   irnorm            <float>      ..F.A...... set IR norm (from -1 to 2) (default 1)
   irlink            <boolean>    ..F.A...... set IR link (default true)
   irgain            <float>      ..F.A...... set IR gain (from 0 to 1) (default 1)
   irfmt             <int>        ..F.A...... set IR format (from 0 to 1) (default input)
     mono            0            ..F.A...... single channel
     input           1            ..F.A...... same as input
   maxir             <float>      ..F.A...... set max IR length (from 0.1 to 60) (default 30)
   response          <boolean>    ..FV......P show IR frequency response (default false)
   channel           <int>        ..FV......P set IR channel to display frequency response (from 0 to 1024) (default 0)
   size              <image_size> ..FV......P set video size (default "hd720")
   rate              <video_rate> ..FV......P set video rate (default "25")
   minp              <int>        ..F.A...... set min partition size (from 1 to 65536) (default 8192)
   maxp              <int>        ..F.A...... set max partition size (from 8 to 65536) (default 8192)
   nbirs             <int>        ..F.A...... set number of input IRs (from 1 to 32) (default 1)
   ir                <int>        ..F.A....T. select IR (from 0 to 31) (default 0)
   precision         <int>        ..F.A...... set processing precision (from 0 to 2) (default auto)
     auto            0            ..F.A...... set auto processing precision
     float           1            ..F.A...... set single-floating point processing precision
     double          2            ..F.A...... set double-floating point processing precision
   irload            <int>        ..F.A...... set IR loading type (from 0 to 1) (default init)
     init            0            ..F.A...... load all IRs on init
     access          1            ..F.A...... load IR on access

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aformat
==============================
Filter aformat
  Convert the input audio to one of the specified formats.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aformat AVOptions:
   sample_fmts       [<sample_fmt>]..F.A...... A '|'-separated list of sample formats.
   f                 [<sample_fmt>]..F.A...... A '|'-separated list of sample formats.
   sample_rates      [<int>     ]..F.A...... A '|'-separated list of sample rates.
   r                 [<int>     ]..F.A...... A '|'-separated list of sample rates.
   channel_layouts   [<channel_layout>]..F.A...... A '|'-separated list of channel layouts.
   cl                [<channel_layout>]..F.A...... A '|'-separated list of channel layouts.


Exiting with exit code 0

==============================
FILTER: afreqshift
==============================
Filter afreqshift
  Apply frequency shifting to input audio.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
afreqshift AVOptions:
   shift             <double>     ..F.A....T. set frequency shift (from -2.14748e+09 to INT_MAX) (default 0)
   level             <double>     ..F.A....T. set output level (from 0 to 1) (default 1)
   order             <int>        ..F.A....T. set filter order (from 1 to 16) (default 8)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: afwtdn
==============================
Filter afwtdn
  Denoise audio stream using Wavelets.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
afwtdn AVOptions:
   sigma             <double>     ..F.A....T. set noise sigma (from 0 to 1) (default 0)
   levels            <int>        ..F.A...... set number of wavelet levels (from 1 to 12) (default 10)
   wavet             <int>        ..F.A...... set wavelet type (from 0 to 6) (default sym10)
     sym2            0            ..F.A...... sym2
     sym4            1            ..F.A...... sym4
     rbior68         2            ..F.A...... rbior68
     deb10           3            ..F.A...... deb10
     sym10           4            ..F.A...... sym10
     coif5           5            ..F.A...... coif5
     bl3             6            ..F.A...... bl3
   percent           <double>     ..F.A....T. set percent of full denoising (from 0 to 100) (default 85)
   profile           <boolean>    ..F.A....T. profile noise (default false)
   adaptive          <boolean>    ..F.A....T. adaptive profiling of noise (default false)
   samples           <int>        ..F.A...... set frame size in number of samples (from 512 to 65536) (default 8192)
   softness          <double>     ..F.A....T. set thresholding softness (from 0 to 10) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: agate
==============================
Filter agate
  Audio gate.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
agate/sidechaingate AVOptions:
   level_in          <double>     ..F.A....T. set input level (from 0.015625 to 64) (default 1)
   mode              <int>        ..F.A....T. set mode (from 0 to 1) (default downward)
     downward        0            ..F.A....T.
     upward          1            ..F.A....T.
   range             <double>     ..F.A....T. set max gain reduction (from 0 to 1) (default 0.06125)
   threshold         <double>     ..F.A....T. set threshold (from 0 to 1) (default 0.125)
   ratio             <double>     ..F.A....T. set ratio (from 1 to 9000) (default 2)
   attack            <double>     ..F.A....T. set attack (from 0.01 to 9000) (default 20)
   release           <double>     ..F.A....T. set release (from 0.01 to 9000) (default 250)
   makeup            <double>     ..F.A....T. set makeup gain (from 1 to 64) (default 1)
   knee              <double>     ..F.A....T. set knee (from 1 to 8) (default 2.82843)
   detection         <int>        ..F.A....T. set detection (from 0 to 1) (default rms)
     peak            0            ..F.A....T.
     rms             1            ..F.A....T.
   link              <int>        ..F.A....T. set link (from 0 to 1) (default average)
     average         0            ..F.A....T.
     maximum         1            ..F.A....T.
   level_sc          <double>     ..F.A....T. set sidechain gain (from 0.015625 to 64) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aiir
==============================
Filter aiir
  Apply Infinite Impulse Response filter with supplied coefficients.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
aiir AVOptions:
   zeros             <string>     ..F.A...... set B/numerator/zeros/reflection coefficients (default "1+0i 1-0i")
   z                 <string>     ..F.A...... set B/numerator/zeros/reflection coefficients (default "1+0i 1-0i")
   poles             <string>     ..F.A...... set A/denominator/poles/ladder coefficients (default "1+0i 1-0i")
   p                 <string>     ..F.A...... set A/denominator/poles/ladder coefficients (default "1+0i 1-0i")
   gains             <string>     ..F.A...... set channels gains (default "1|1")
   k                 <string>     ..F.A...... set channels gains (default "1|1")
   dry               <double>     ..F.A...... set dry gain (from 0 to 1) (default 1)
   wet               <double>     ..F.A...... set wet gain (from 0 to 1) (default 1)
   format            <int>        ..F.A...... set coefficients format (from -2 to 4) (default zp)
     ll              -2           ..F.A...... lattice-ladder function
     sf              -1           ..F.A...... analog transfer function
     tf              0            ..F.A...... digital transfer function
     zp              1            ..F.A...... Z-plane zeros/poles
     pr              2            ..F.A...... Z-plane zeros/poles (polar radians)
     pd              3            ..F.A...... Z-plane zeros/poles (polar degrees)
     sp              4            ..F.A...... S-plane zeros/poles
   f                 <int>        ..F.A...... set coefficients format (from -2 to 4) (default zp)
     ll              -2           ..F.A...... lattice-ladder function
     sf              -1           ..F.A...... analog transfer function
     tf              0            ..F.A...... digital transfer function
     zp              1            ..F.A...... Z-plane zeros/poles
     pr              2            ..F.A...... Z-plane zeros/poles (polar radians)
     pd              3            ..F.A...... Z-plane zeros/poles (polar degrees)
     sp              4            ..F.A...... S-plane zeros/poles
   process           <int>        ..F.A...... set kind of processing (from 0 to 2) (default s)
     d               0            ..F.A...... direct
     s               1            ..F.A...... serial
     p               2            ..F.A...... parallel
   r                 <int>        ..F.A...... set kind of processing (from 0 to 2) (default s)
     d               0            ..F.A...... direct
     s               1            ..F.A...... serial
     p               2            ..F.A...... parallel
   precision         <int>        ..F.A...... set filtering precision (from 0 to 3) (default dbl)
     dbl             0            ..F.A...... double-precision floating-point
     flt             1            ..F.A...... single-precision floating-point
     i32             2            ..F.A...... 32-bit integers
     i16             3            ..F.A...... 16-bit integers
   e                 <int>        ..F.A...... set precision (from 0 to 3) (default dbl)
     dbl             0            ..F.A...... double-precision floating-point
     flt             1            ..F.A...... single-precision floating-point
     i32             2            ..F.A...... 32-bit integers
     i16             3            ..F.A...... 16-bit integers
   normalize         <boolean>    ..F.A...... normalize coefficients (default true)
   n                 <boolean>    ..F.A...... normalize coefficients (default true)
   mix               <double>     ..F.A...... set mix (from 0 to 1) (default 1)
   response          <boolean>    ..FV....... show IR frequency response (default false)
   channel           <int>        ..FV....... set IR channel to display frequency response (from 0 to 1024) (default 0)
   size              <image_size> ..FV....... set video size (default "hd720")
   rate              <video_rate> ..FV....... set video rate (default "25")


Exiting with exit code 0

==============================
FILTER: aintegral
==============================
Filter aintegral
  Compute integral of input audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aderivative/aintegral AVOptions:

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: ainterleave
==============================
Filter ainterleave
  Temporally interleave audio inputs.
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
ainterleave AVOptions:
   nb_inputs         <int>        ..F.A...... set number of inputs (from 1 to INT_MAX) (default 2)
   n                 <int>        ..F.A...... set number of inputs (from 1 to INT_MAX) (default 2)
   duration          <int>        ..F.A...... how to determine the end-of-stream (from 0 to 2) (default longest)
     longest         0            ..F.A...... Duration of longest input
     shortest        1            ..F.A...... Duration of shortest input
     first           2            ..F.A...... Duration of first input


Exiting with exit code 0

==============================
FILTER: alatency
==============================
Filter alatency
  Report audio filtering latency.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: alimiter
==============================
Filter alimiter
  Audio lookahead limiter.
    Inputs:
       #0: main (audio)
    Outputs:
       #0: default (audio)
alimiter AVOptions:
   level_in          <double>     ..F.A....T. set input level (from 0.015625 to 64) (default 1)
   level_out         <double>     ..F.A....T. set output level (from 0.015625 to 64) (default 1)
   limit             <double>     ..F.A....T. set limit (from 0.0625 to 1) (default 1)
   attack            <double>     ..F.A....T. set attack (from 0.1 to 80) (default 5)
   release           <double>     ..F.A....T. set release (from 1 to 8000) (default 50)
   asc               <boolean>    ..F.A....T. enable asc (default false)
   asc_level         <double>     ..F.A....T. set asc level (from 0 to 1) (default 0.5)
   level             <boolean>    ..F.A....T. auto level (default true)
   latency           <boolean>    ..F.A....T. compensate delay (default false)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: allpass
==============================
Filter allpass
  Apply a two-pole all-pass filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
allpass AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.707)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.707)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   order             <int>        ..F.A....T. set filter order (from 1 to 2) (default 2)
   o                 <int>        ..F.A....T. set filter order (from 1 to 2) (default 2)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aloop
==============================
Filter aloop
  Loop audio samples.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aloop AVOptions:
   loop              <int>        ..F.A...... number of loops (from -1 to INT_MAX) (default 0)
   size              <int64>      ..F.A...... max number of samples to loop (from 0 to INT_MAX) (default 0)
   start             <int64>      ..F.A...... set the loop start sample (from -1 to I64_MAX) (default 0)
   time              <duration>   ..F.A...... set the loop start time (default INT64_MAX)


Exiting with exit code 0

==============================
FILTER: amerge
==============================
Filter amerge
  Merge two or more audio streams into a single multi-channel stream.
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
amerge AVOptions:
   inputs            <int>        ..F.A...... specify the number of inputs (from 1 to 64) (default 2)
   layout_mode       <int>        ..F.A...... method used to determine the output channel layout (from 0 to 2) (default legacy)
     legacy          0            ..F.A......
     reset           1            ..F.A......
     normal          2            ..F.A......


Exiting with exit code 0

==============================
FILTER: ametadata
==============================
Filter ametadata
  Manipulate audio frame metadata.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
ametadata AVOptions:
   mode              <int>        ..F.A...... set a mode of operation (from 0 to 4) (default select)
     select          0            ..F.A...... select frame
     add             1            ..F.A...... add new metadata
     modify          2            ..F.A...... modify metadata
     delete          3            ..F.A...... delete metadata
     print           4            ..F.A...... print metadata
   key               <string>     ..F.A...... set metadata key
   value             <string>     ..F.A...... set metadata value
   function          <int>        ..F.A...... function for comparing values (from 0 to 6) (default same_str)
     same_str        0            ..F.A......
     starts_with     1            ..F.A......
     less            2            ..F.A......
     equal           3            ..F.A......
     greater         4            ..F.A......
     expr            5            ..F.A......
     ends_with       6            ..F.A......
   expr              <string>     ..F.A...... set expression for expr function
   file              <string>     ..F.A...... set file where to print metadata information
   direct            <boolean>    ..F.A...... reduce buffering when printing to user-set file or pipe (default false)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: amix
==============================
Filter amix
  Audio mixing.
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
amix AVOptions:
   inputs            <int>        ..F.A...... Number of inputs. (from 1 to 32767) (default 2)
   duration          <int>        ..F.A...... How to determine the end-of-stream. (from 0 to 2) (default longest)
     longest         0            ..F.A...... Duration of longest input.
     shortest        1            ..F.A...... Duration of shortest input.
     first           2            ..F.A...... Duration of first input.
   dropout_transition <float>      ..F.A...... Transition time, in seconds, for volume renormalization when an input stream ends. (from 0 to INT_MAX) (default 2)
   weights           <string>     ..F.A....T. Set weight for each input. (default "1 1")
   normalize         <boolean>    ..F.A....T. Scale inputs (default true)


Exiting with exit code 0

==============================
FILTER: anequalizer
==============================
Filter anequalizer
  Apply high-order audio parametric multi band equalizer.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
anequalizer AVOptions:
   params            <string>     ..F.A...... (default "")
   curves            <boolean>    ..FV....... draw frequency response curves (default false)
   size              <image_size> ..FV....... set video size (default "hd720")
   mgain             <double>     ..FV....... set max gain (from -900 to 900) (default 60)
   fscale            <int>        ..FV....... set frequency scale (from 0 to 1) (default log)
     lin             0            ..FV....... linear
     log             1            ..FV....... logarithmic
   colors            <string>     ..FV....... set channels curves colors (default "red|green|blue|yellow|orange|lime|pink|magenta|brown")

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: anlmdn
==============================
Filter anlmdn
  Reduce broadband noise from stream using Non-Local Means.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
anlmdn AVOptions:
   strength          <float>      ..F.A....T. set denoising strength (from 1e-05 to 10000) (default 1e-05)
   s                 <float>      ..F.A....T. set denoising strength (from 1e-05 to 10000) (default 1e-05)
   patch             <duration>   ..F.A....T. set patch duration (default 0.002)
   p                 <duration>   ..F.A....T. set patch duration (default 0.002)
   research          <duration>   ..F.A....T. set research duration (default 0.006)
   r                 <duration>   ..F.A....T. set research duration (default 0.006)
   output            <int>        ..F.A....T. set output mode (from 0 to 2) (default o)
     i               0            ..F.A....T. input
     o               1            ..F.A....T. output
     n               2            ..F.A....T. noise
   o                 <int>        ..F.A....T. set output mode (from 0 to 2) (default o)
     i               0            ..F.A....T. input
     o               1            ..F.A....T. output
     n               2            ..F.A....T. noise
   smooth            <float>      ..F.A....T. set smooth factor (from 1 to 1000) (default 11)
   m                 <float>      ..F.A....T. set smooth factor (from 1 to 1000) (default 11)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: anull
==============================
Filter anull
  Pass the source unchanged to the output.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)

Exiting with exit code 0

==============================
FILTER: apad
==============================
Filter apad
  Pad audio with silence.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
apad AVOptions:
   packet_size       <int>        ..F.A...... set silence packet size (from 0 to INT_MAX) (default 4096)
   pad_len           <int64>      ..F.A...... set number of samples of silence to add (from -1 to I64_MAX) (default -1)
   whole_len         <int64>      ..F.A...... set minimum target number of samples in the audio stream (from -1 to I64_MAX) (default -1)
   pad_dur           <duration>   ..F.A...... set duration of silence to add (default -0.000001)
   whole_dur         <duration>   ..F.A...... set minimum target duration in the audio stream (default -0.000001)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aperms
==============================
Filter aperms
  Set permissions for the output audio frame.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
(a)perms AVOptions:
   mode              <int>        ..FVA....T. select permissions mode (from 0 to 4) (default none)
     none            0            ..FVA....T. do nothing
     ro              1            ..FVA....T. set all output frames read-only
     rw              2            ..FVA....T. set all output frames writable
     toggle          3            ..FVA....T. switch permissions
     random          4            ..FVA....T. set permissions randomly
   seed              <int64>      ..FVA...... set the seed for the random mode (from -1 to UINT32_MAX) (default -1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aphaser
==============================
Filter aphaser
  Add a phasing effect to the audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aphaser AVOptions:
   in_gain           <double>     ..F.A...... set input gain (from 0 to 1) (default 0.4)
   out_gain          <double>     ..F.A...... set output gain (from 0 to 1e+09) (default 0.74)
   delay             <double>     ..F.A...... set delay in milliseconds (from 0 to 5) (default 3)
   decay             <double>     ..F.A...... set decay (from 0 to 0.99) (default 0.4)
   speed             <double>     ..F.A...... set modulation speed (from 0.1 to 2) (default 0.5)
   type              <int>        ..F.A...... set modulation type (from 0 to 1) (default triangular)
     triangular      1            ..F.A......
     t               1            ..F.A......
     sinusoidal      0            ..F.A......
     s               0            ..F.A......


Exiting with exit code 0

==============================
FILTER: aphaseshift
==============================
Filter aphaseshift
  Apply phase shifting to input audio.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aphaseshift AVOptions:
   shift             <double>     ..F.A....T. set phase shift (from -1 to 1) (default 0)
   level             <double>     ..F.A....T. set output level (from 0 to 1) (default 1)
   order             <int>        ..F.A....T. set filter order (from 1 to 16) (default 8)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: apsyclip
==============================
Filter apsyclip
  Audio Psychoacoustic Clipper.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
apsyclip AVOptions:
   level_in          <double>     ..F.A....T. set input level (from 0.015625 to 64) (default 1)
   level_out         <double>     ..F.A....T. set output level (from 0.015625 to 64) (default 1)
   clip              <double>     ..F.A....T. set clip level (from 0.015625 to 1) (default 1)
   diff              <boolean>    ..F.A....T. enable difference (default false)
   adaptive          <double>     ..F.A....T. set adaptive distortion (from 0 to 1) (default 0.5)
   iterations        <int>        ..F.A....T. set iterations (from 1 to 20) (default 10)
   level             <boolean>    ..F.A....T. set auto level (default false)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: apulsator
==============================
Filter apulsator
  Audio pulsator.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
apulsator AVOptions:
   level_in          <double>     ..F.A...... set input gain (from 0.015625 to 64) (default 1)
   level_out         <double>     ..F.A...... set output gain (from 0.015625 to 64) (default 1)
   mode              <int>        ..F.A...... set mode (from 0 to 4) (default sine)
     sine            0            ..F.A......
     triangle        1            ..F.A......
     square          2            ..F.A......
     sawup           3            ..F.A......
     sawdown         4            ..F.A......
   amount            <double>     ..F.A...... set modulation (from 0 to 1) (default 1)
   offset_l          <double>     ..F.A...... set offset L (from 0 to 1) (default 0)
   offset_r          <double>     ..F.A...... set offset R (from 0 to 1) (default 0.5)
   width             <double>     ..F.A...... set pulse width (from 0 to 2) (default 1)
   timing            <int>        ..F.A...... set timing (from 0 to 2) (default hz)
     bpm             0            ..F.A......
     ms              1            ..F.A......
     hz              2            ..F.A......
   bpm               <double>     ..F.A...... set BPM (from 30 to 300) (default 120)
   ms                <int>        ..F.A...... set ms (from 10 to 2000) (default 500)
   hz                <double>     ..F.A...... set frequency (from 0.01 to 100) (default 2)


Exiting with exit code 0

==============================
FILTER: arealtime
==============================
Filter arealtime
  Slow down filtering to match realtime.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
(a)realtime AVOptions:
   limit             <duration>   ..FVA....T. sleep time limit (default 2)
   speed             <double>     ..FVA....T. speed factor (from DBL_MIN to DBL_MAX) (default 1)


Exiting with exit code 0

==============================
FILTER: aresample
==============================
Filter aresample
  Resample audio data.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aresample AVOptions:
   sample_rate       <int>        ..F.A...... (from 0 to INT_MAX) (default 0)

SWResampler AVOptions:
  -isr               <int>        ....A...... set input sample rate (from 0 to INT_MAX) (default 0)
  -in_sample_rate    <int>        ....A...... set input sample rate (from 0 to INT_MAX) (default 0)
  -osr               <int>        ....A...... set output sample rate (from 0 to INT_MAX) (default 0)
  -out_sample_rate   <int>        ....A...... set output sample rate (from 0 to INT_MAX) (default 0)
  -isf               <sample_fmt> ....A...... set input sample format (default none)
  -in_sample_fmt     <sample_fmt> ....A...... set input sample format (default none)
  -osf               <sample_fmt> ....A...... set output sample format (default none)
  -out_sample_fmt    <sample_fmt> ....A...... set output sample format (default none)
  -tsf               <sample_fmt> ....A...... set internal sample format (default none)
  -internal_sample_fmt <sample_fmt> ....A...... set internal sample format (default none)
  -ichl              <channel_layout> ....A...... set input channel layout
  -in_chlayout       <channel_layout> ....A...... set input channel layout
  -ochl              <channel_layout> ....A...... set output channel layout
  -out_chlayout      <channel_layout> ....A...... set output channel layout
  -uchl              <channel_layout> ....A...... set used channel layout
  -used_chlayout     <channel_layout> ....A...... set used channel layout
  -clev              <float>      ....A...... set center mix level (from -32 to 32) (default 0.707107)
  -center_mix_level  <float>      ....A...... set center mix level (from -32 to 32) (default 0.707107)
  -slev              <float>      ....A...... set surround mix level (from -32 to 32) (default 0.707107)
  -surround_mix_level <float>      ....A...... set surround mix Level (from -32 to 32) (default 0.707107)
  -lfe_mix_level     <float>      ....A...... set LFE mix level (from -32 to 32) (default 0)
  -rmvol             <float>      ....A...... set rematrix volume (from -1000 to 1000) (default 1)
  -rematrix_volume   <float>      ....A...... set rematrix volume (from -1000 to 1000) (default 1)
  -rematrix_maxval   <float>      ....A...... set rematrix maxval (from 0 to 1000) (default 0)
  -flags             <flags>      ....A...... set flags (default 0)
     res                          ....A...... force resampling
  -swr_flags         <flags>      ....A...... set flags (default 0)
     res                          ....A...... force resampling
  -dither_scale      <float>      ....A...... set dither scale (from 0 to INT_MAX) (default 1)
  -dither_method     <int>        ....A...... set dither method (from 0 to 71) (default 0)
     rectangular     1            ....A...... select rectangular dither
     triangular      2            ....A...... select triangular dither
     triangular_hp   3            ....A...... select triangular dither with high pass
     lipshitz        65           ....A...... select Lipshitz noise shaping dither
     shibata         69           ....A...... select Shibata noise shaping dither
     low_shibata     70           ....A...... select low Shibata noise shaping dither
     high_shibata    71           ....A...... select high Shibata noise shaping dither
     f_weighted      66           ....A...... select f-weighted noise shaping dither
     modified_e_weighted 67           ....A...... select modified-e-weighted noise shaping dither
     improved_e_weighted 68           ....A...... select improved-e-weighted noise shaping dither
  -filter_size       <int>        ....A...... set swr resampling filter size (from 0 to INT_MAX) (default 32)
  -phase_shift       <int>        ....A...... set swr resampling phase shift (from 0 to 24) (default 10)
  -linear_interp     <boolean>    ....A...... enable linear interpolation (default true)
  -exact_rational    <boolean>    ....A...... enable exact rational (default true)
  -cutoff            <double>     ....A...... set cutoff frequency ratio (from 0 to 1) (default 0)
  -resample_cutoff   <double>     ....A...... set cutoff frequency ratio (from 0 to 1) (default 0)
  -resampler         <int>        ....A...... set resampling Engine (from 0 to 1) (default swr)
     swr             0            ....A...... select SW Resampler
     soxr            1            ....A...... select SoX Resampler
  -precision         <double>     ....A...... set soxr resampling precision (in bits) (from 15 to 33) (default 20)
  -cheby             <boolean>    ....A...... enable soxr Chebyshev passband & higher-precision irrational ratio approximation (default false)
  -min_comp          <float>      ....A...... set minimum difference between timestamps and audio data (in seconds) below which no timestamp compensation of either kind is applied (from 0 to FLT_MAX) (default FLT_MAX)
  -min_hard_comp     <float>      ....A...... set minimum difference between timestamps and audio data (in seconds) to trigger padding/trimming the data. (from 0 to INT_MAX) (default 0.1)
  -comp_duration     <float>      ....A...... set duration (in seconds) over which data is stretched/squeezed to make it match the timestamps. (from 0 to INT_MAX) (default 1)
  -max_soft_comp     <float>      ....A...... set maximum factor by which data is stretched/squeezed to make it match the timestamps. (from INT_MIN to INT_MAX) (default 0)
  -async             <float>      ....A...... simplified 1 parameter audio timestamp matching, 0(disabled), 1(filling and trimming), >1(maximum stretch/squeeze in samples per second) (from INT_MIN to INT_MAX) (default 0)
  -first_pts         <int64>      ....A...... Assume the first pts should be this value (in samples). (from I64_MIN to I64_MAX) (default I64_MIN)
  -matrix_encoding   <int>        ....A...... set matrixed stereo encoding (from 0 to 6) (default none)
     none            0            ....A...... select none
     dolby           1            ....A...... select Dolby
     dplii           2            ....A...... select Dolby Pro Logic II
  -filter_type       <int>        ....A...... select swr filter type (from 0 to 2) (default kaiser)
     cubic           0            ....A...... select cubic
     blackman_nuttall 1            ....A...... select Blackman Nuttall windowed sinc
     kaiser          2            ....A...... select Kaiser windowed sinc
  -kaiser_beta       <double>     ....A...... set swr Kaiser window beta (from 2 to 16) (default 9)
  -output_sample_bits <int>        ....A...... set swr number of output sample bits (from 0 to 64) (default 0)


Exiting with exit code 0

==============================
FILTER: areverse
==============================
Filter areverse
  Reverse an audio clip.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)

Exiting with exit code 0

==============================
FILTER: arnndn
==============================
Filter arnndn
  Reduce noise from speech using Recurrent Neural Networks.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
arnndn AVOptions:
   model             <string>     ..F.A....T. set model name
   m                 <string>     ..F.A....T. set model name
   mix               <float>      ..F.A....T. set output vs input mix (from -1 to 1) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: asegment
==============================
Filter asegment
  Segment audio stream.
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
asegment AVOptions:
   timestamps        <string>     ..F.A...... timestamps of input at which to split input
   samples           <string>     ..F.A...... samples at which to split input


Exiting with exit code 0

==============================
FILTER: aselect
==============================
Filter aselect
  Select audio frames to pass in output.
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
aselect AVOptions:
   expr              <string>     ..F.A...... set an expression to use for selecting frames (default "1")
   e                 <string>     ..F.A...... set an expression to use for selecting frames (default "1")
   outputs           <int>        ..F.A...... set the number of outputs (from 1 to INT_MAX) (default 1)
   n                 <int>        ..F.A...... set the number of outputs (from 1 to INT_MAX) (default 1)


Exiting with exit code 0

==============================
FILTER: asendcmd
==============================
Filter asendcmd
  Send commands to filters.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
(a)sendcmd AVOptions:
   commands          <string>     ..FVA...... set commands
   c                 <string>     ..FVA...... set commands
   filename          <string>     ..FVA...... set commands file
   f                 <string>     ..FVA...... set commands file


Exiting with exit code 0

==============================
FILTER: asetnsamples
==============================
Filter asetnsamples
  Set the number of samples for each output audio frames.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asetnsamples AVOptions:
   nb_out_samples    <int>        ..F.A....T. set the number of per-frame output samples (from 1 to INT_MAX) (default 1024)
   n                 <int>        ..F.A....T. set the number of per-frame output samples (from 1 to INT_MAX) (default 1024)
   pad               <boolean>    ..F.A....T. pad last frame with zeros (default true)
   p                 <boolean>    ..F.A....T. pad last frame with zeros (default true)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: asetpts
==============================
Filter asetpts
  Set PTS for the output audio frame.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asetpts AVOptions:
   expr              <string>     ..F.A....T. Expression determining the frame timestamp (default "PTS")


Exiting with exit code 0

==============================
FILTER: asetrate
==============================
Filter asetrate
  Change the sample rate without altering the data.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asetrate AVOptions:
   sample_rate       <int>        ..F.A...... set the sample rate (from 1 to INT_MAX) (default 44100)
   r                 <int>        ..F.A...... set the sample rate (from 1 to INT_MAX) (default 44100)


Exiting with exit code 0

==============================
FILTER: asettb
==============================
Filter asettb
  Set timebase for the audio output link.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asettb AVOptions:
   expr              <string>     ..F.A...... set expression determining the output timebase (default "intb")
   tb                <string>     ..F.A...... set expression determining the output timebase (default "intb")


Exiting with exit code 0

==============================
FILTER: ashowinfo
==============================
Filter ashowinfo
  Show textual information for each audio frame.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)

Exiting with exit code 0

==============================
FILTER: asidedata
==============================
Filter asidedata
  Manipulate audio frame side data.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asidedata AVOptions:
   mode              <int>        ..F.A...... set a mode of operation (from 0 to 1) (default select)
     select          0            ..F.A...... select frame
     delete          1            ..F.A...... delete side data
   type              <int>        ..F.A...... set side data type (from -1 to INT_MAX) (default -1)
     PANSCAN         0            ..F.A...... 
     A53_CC          1            ..F.A...... 
     STEREO3D        2            ..F.A...... 
     MATRIXENCODING  3            ..F.A...... 
     DOWNMIX_INFO    4            ..F.A...... 
     REPLAYGAIN      5            ..F.A...... 
     DISPLAYMATRIX   6            ..F.A...... 
     AFD             7            ..F.A...... 
     MOTION_VECTORS  8            ..F.A...... 
     SKIP_SAMPLES    9            ..F.A...... 
     AUDIO_SERVICE_TYPE 10           ..F.A...... 
     MASTERING_DISPLAY_METADATA 11           ..F.A...... 
     GOP_TIMECODE    12           ..F.A...... 
     SPHERICAL       13           ..F.A...... 
     CONTENT_LIGHT_LEVEL 14           ..F.A...... 
     ICC_PROFILE     15           ..F.A...... 
     S12M_TIMECOD    16           ..F.A.....P 
     S12M_TIMECODE   16           ..F.A...... 
     DYNAMIC_HDR_PLUS 17           ..F.A...... 
     REGIONS_OF_INTEREST 18           ..F.A...... 
     VIDEO_ENC_PARAMS 19           ..F.A...... 
     SEI_UNREGISTERED 20           ..F.A...... 
     FILM_GRAIN_PARAMS 21           ..F.A...... 
     DETECTION_BOUNDING_BOXES 22           ..F.A...... 
     DETECTION_BBOXES 22           ..F.A...... 
     DOVI_RPU_BUFFER 23           ..F.A...... 
     DOVI_METADATA   24           ..F.A...... 
     DYNAMIC_HDR_VIVID 25           ..F.A...... 
     AMBIENT_VIEWING_ENVIRONMENT 26           ..F.A...... 
     VIDEO_HINT      27           ..F.A...... 

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: asoftclip
==============================
Filter asoftclip
  Audio Soft Clipper.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asoftclip AVOptions:
   type              <int>        ..F.A....T. set softclip type (from -1 to 7) (default tanh)
     hard            -1           ..F.A....T.
     tanh            0            ..F.A....T.
     atan            1            ..F.A....T.
     cubic           2            ..F.A....T.
     exp             3            ..F.A....T.
     alg             4            ..F.A....T.
     quintic         5            ..F.A....T.
     sin             6            ..F.A....T.
     erf             7            ..F.A....T.
   threshold         <double>     ..F.A....T. set softclip threshold (from 1e-06 to 1) (default 1)
   output            <double>     ..F.A....T. set softclip output gain (from 1e-06 to 16) (default 1)
   param             <double>     ..F.A....T. set softclip parameter (from 0.01 to 3) (default 1)
   oversample        <int>        ..F.A....T. set oversample factor (from 1 to 64) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: aspectralstats
==============================
Filter aspectralstats
  Show frequency domain statistics about audio frames.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
aspectralstats AVOptions:
   win_size          <int>        ..F.A...... set the window size (from 32 to 65536) (default 2048)
   win_func          <int>        ..F.A...... set window function (from 0 to 20) (default hann)
     rect            0            ..F.A...... Rectangular
     bartlett        4            ..F.A...... Bartlett
     hann            1            ..F.A...... Hann
     hanning         1            ..F.A...... Hanning
     hamming         2            ..F.A...... Hamming
     blackman        3            ..F.A...... Blackman
     welch           5            ..F.A...... Welch
     flattop         6            ..F.A...... Flat-top
     bharris         7            ..F.A...... Blackman-Harris
     bnuttall        8            ..F.A...... Blackman-Nuttall
     bhann           11           ..F.A...... Bartlett-Hann
     sine            9            ..F.A...... Sine
     nuttall         10           ..F.A...... Nuttall
     lanczos         12           ..F.A...... Lanczos
     gauss           13           ..F.A...... Gauss
     tukey           14           ..F.A...... Tukey
     dolph           15           ..F.A...... Dolph-Chebyshev
     cauchy          16           ..F.A...... Cauchy
     parzen          17           ..F.A...... Parzen
     poisson         18           ..F.A...... Poisson
     bohman          19           ..F.A...... Bohman
     kaiser          20           ..F.A...... Kaiser
   overlap           <float>      ..F.A...... set window overlap (from 0 to 1) (default 0.5)
   measure           <flags>      ..F.A...... select the parameters which are measured (default all+mean+variance+centroid+spread+skewness+kurtosis+entropy+flatness+crest+flux+slope+decrease+rolloff)
     none                         ..F.A...... 
     all                          ..F.A...... 
     mean                         ..F.A...... 
     variance                     ..F.A...... 
     centroid                     ..F.A...... 
     spread                       ..F.A...... 
     skewness                     ..F.A...... 
     kurtosis                     ..F.A...... 
     entropy                      ..F.A...... 
     flatness                     ..F.A...... 
     crest                        ..F.A...... 
     flux                         ..F.A...... 
     slope                        ..F.A...... 
     decrease                     ..F.A...... 
     rolloff                      ..F.A...... 


Exiting with exit code 0

==============================
FILTER: asplit
==============================
Filter asplit
  Pass on the audio input to N audio outputs.
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
(a)split AVOptions:
   outputs           <int>        ..FVA...... set number of outputs (from 1 to INT_MAX) (default 2)


Exiting with exit code 0

==============================
FILTER: astats
==============================
Filter astats
  Show time domain statistics about audio frames.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
astats AVOptions:
   length            <double>     ..F.A...... set the window length (from 0 to 10) (default 0.05)
   metadata          <boolean>    ..F.A...... inject metadata in the filtergraph (default false)
   reset             <int>        ..F.A...... Set the number of frames over which cumulative stats are calculated before being reset (from 0 to INT_MAX) (default 0)
   measure_perchannel <flags>      ..F.A...... Select the parameters which are measured per channel (default all+Bit_depth+Crest_factor+DC_offset+Dynamic_range+Entropy+Flat_factor+Max_difference+Max_level+Mean_difference+Min_difference+Min_level+Noise_floor+Noise_floor_count+Number_of_Infs+Number_of_NaNs+Number_of_denormals+Number_of_samples+Peak_count+Peak_level+RMS_difference+RMS_level+RMS_peak+RMS_trough+Zero_crossings+Zero_crossings_rate+Abs_Peak_count)
     none                         ..F.A...... 
     all                          ..F.A...... 
     Bit_depth                    ..F.A...... 
     Crest_factor                 ..F.A...... 
     DC_offset                    ..F.A...... 
     Dynamic_range                ..F.A...... 
     Entropy                      ..F.A...... 
     Flat_factor                  ..F.A...... 
     Max_difference               ..F.A...... 
     Max_level                    ..F.A...... 
     Mean_difference              ..F.A...... 
     Min_difference               ..F.A...... 
     Min_level                    ..F.A...... 
     Noise_floor                  ..F.A...... 
     Noise_floor_count              ..F.A...... 
     Number_of_Infs               ..F.A...... 
     Number_of_NaNs               ..F.A...... 
     Number_of_denormals              ..F.A...... 
     Number_of_samples              ..F.A...... 
     Peak_count                   ..F.A...... 
     Peak_level                   ..F.A...... 
     RMS_difference               ..F.A...... 
     RMS_level                    ..F.A...... 
     RMS_peak                     ..F.A...... 
     RMS_trough                   ..F.A...... 
     Zero_crossings               ..F.A...... 
     Zero_crossings_rate              ..F.A...... 
     Abs_Peak_count               ..F.A...... 
   measure_overall   <flags>      ..F.A...... Select the parameters which are measured overall (default all+Bit_depth+Crest_factor+DC_offset+Dynamic_range+Entropy+Flat_factor+Max_difference+Max_level+Mean_difference+Min_difference+Min_level+Noise_floor+Noise_floor_count+Number_of_Infs+Number_of_NaNs+Number_of_denormals+Number_of_samples+Peak_count+Peak_level+RMS_difference+RMS_level+RMS_peak+RMS_trough+Zero_crossings+Zero_crossings_rate+Abs_Peak_count)
     none                         ..F.A...... 
     all                          ..F.A...... 
     Bit_depth                    ..F.A...... 
     Crest_factor                 ..F.A...... 
     DC_offset                    ..F.A...... 
     Dynamic_range                ..F.A...... 
     Entropy                      ..F.A...... 
     Flat_factor                  ..F.A...... 
     Max_difference               ..F.A...... 
     Max_level                    ..F.A...... 
     Mean_difference              ..F.A...... 
     Min_difference               ..F.A...... 
     Min_level                    ..F.A...... 
     Noise_floor                  ..F.A...... 
     Noise_floor_count              ..F.A...... 
     Number_of_Infs               ..F.A...... 
     Number_of_NaNs               ..F.A...... 
     Number_of_denormals              ..F.A...... 
     Number_of_samples              ..F.A...... 
     Peak_count                   ..F.A...... 
     Peak_level                   ..F.A...... 
     RMS_difference               ..F.A...... 
     RMS_level                    ..F.A...... 
     RMS_peak                     ..F.A...... 
     RMS_trough                   ..F.A...... 
     Zero_crossings               ..F.A...... 
     Zero_crossings_rate              ..F.A...... 
     Abs_Peak_count               ..F.A...... 


Exiting with exit code 0

==============================
FILTER: asubboost
==============================
Filter asubboost
  Boost subwoofer frequencies.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asubboost AVOptions:
   dry               <double>     ..F.A....T. set dry gain (from 0 to 1) (default 1)
   wet               <double>     ..F.A....T. set wet gain (from 0 to 1) (default 1)
   boost             <double>     ..F.A....T. set max boost (from 1 to 12) (default 2)
   decay             <double>     ..F.A....T. set decay (from 0 to 1) (default 0)
   feedback          <double>     ..F.A....T. set feedback (from 0 to 1) (default 0.9)
   cutoff            <double>     ..F.A....T. set cutoff (from 50 to 900) (default 100)
   slope             <double>     ..F.A....T. set slope (from 0.0001 to 1) (default 0.5)
   delay             <double>     ..F.A....T. set delay (from 1 to 100) (default 20)
   channels          <string>     ..F.A....T. set channels to filter (default "all")

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: asubcut
==============================
Filter asubcut
  Cut subwoofer frequencies.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asubcut AVOptions:
   cutoff            <double>     ..F.A....T. set cutoff frequency (from 2 to 200) (default 20)
   order             <int>        ..F.A....T. set filter order (from 3 to 20) (default 10)
   level             <double>     ..F.A....T. set input level (from 0 to 1) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: asupercut
==============================
Filter asupercut
  Cut super frequencies.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asupercut AVOptions:
   cutoff            <double>     ..F.A....T. set cutoff frequency (from 20000 to 192000) (default 20000)
   order             <int>        ..F.A....T. set filter order (from 3 to 20) (default 10)
   level             <double>     ..F.A....T. set input level (from 0 to 1) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: asuperpass
==============================
Filter asuperpass
  Apply high order Butterworth band-pass filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asuperpass/asuperstop AVOptions:
   centerf           <double>     ..F.A....T. set center frequency (from 2 to 999999) (default 1000)
   order             <int>        ..F.A....T. set filter order (from 4 to 20) (default 4)
   qfactor           <double>     ..F.A....T. set Q-factor (from 0.01 to 100) (default 1)
   level             <double>     ..F.A....T. set input level (from 0 to 2) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: asuperstop
==============================
Filter asuperstop
  Apply high order Butterworth band-stop filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
asuperpass/asuperstop AVOptions:
   centerf           <double>     ..F.A....T. set center frequency (from 2 to 999999) (default 1000)
   order             <int>        ..F.A....T. set filter order (from 4 to 20) (default 4)
   qfactor           <double>     ..F.A....T. set Q-factor (from 0.01 to 100) (default 1)
   level             <double>     ..F.A....T. set input level (from 0 to 2) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: atempo
==============================
Filter atempo
  Adjust audio tempo.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
atempo AVOptions:
   tempo             <double>     ..F.A....T. set tempo scale factor (from 0.5 to 100) (default 1)


Exiting with exit code 0

==============================
FILTER: atilt
==============================
Filter atilt
  Apply spectral tilt to audio.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
atilt AVOptions:
   freq              <double>     ..F.A....T. set central frequency (from 20 to 192000) (default 10000)
   slope             <double>     ..F.A....T. set filter slope (from -1 to 1) (default 0)
   width             <double>     ..F.A....T. set filter width (from 100 to 10000) (default 1000)
   order             <int>        ..F.A....T. set filter order (from 2 to 30) (default 5)
   level             <double>     ..F.A....T. set input level (from 0 to 4) (default 1)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: atrim
==============================
Filter atrim
  Pick one continuous section from the input, drop the rest.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
atrim AVOptions:
   start             <duration>   ..F.A...... Timestamp of the first frame that should be passed (default INT64_MAX)
   starti            <duration>   ..F.A...... Timestamp of the first frame that should be passed (default INT64_MAX)
   end               <duration>   ..F.A...... Timestamp of the first frame that should be dropped again (default INT64_MAX)
   endi              <duration>   ..F.A...... Timestamp of the first frame that should be dropped again (default INT64_MAX)
   start_pts         <int64>      ..F.A...... Timestamp of the first frame that should be  passed (from I64_MIN to I64_MAX) (default I64_MIN)
   end_pts           <int64>      ..F.A...... Timestamp of the first frame that should be dropped again (from I64_MIN to I64_MAX) (default I64_MIN)
   duration          <duration>   ..F.A...... Maximum duration of the output (default 0)
   durationi         <duration>   ..F.A...... Maximum duration of the output (default 0)
   start_sample      <int64>      ..F.A...... Number of the first audio sample that should be passed to the output (from -1 to I64_MAX) (default -1)
   end_sample        <int64>      ..F.A...... Number of the first audio sample that should be dropped again (from 0 to I64_MAX) (default I64_MAX)


Exiting with exit code 0

==============================
FILTER: azmq
==============================
Filter azmq
  Receive commands through ZMQ and broker them to filters.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
(a)zmq AVOptions:
   bind_address      <string>     ..FVA...... set bind address (default "tcp://*:5555")
   b                 <string>     ..FVA...... set bind address (default "tcp://*:5555")


Exiting with exit code 0

==============================
FILTER: bandpass
==============================
Filter bandpass
  Apply a two-pole Butterworth band-pass filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
bandpass AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   csg               <boolean>    ..F.A....T. use constant skirt gain (default false)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: bandreject
==============================
Filter bandreject
  Apply a two-pole Butterworth band-reject filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
bandreject AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: bass
==============================
Filter bass
  Boost or cut lower frequencies.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
bass/lowshelf AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 100)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 100)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   gain              <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   g                 <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   poles             <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   p                 <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: biquad
==============================
Filter biquad
  Apply a biquad IIR filter with the given coefficients.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
biquad AVOptions:
   a0                <double>     ..F.A....T. (from INT_MIN to INT_MAX) (default 1)
   a1                <double>     ..F.A....T. (from INT_MIN to INT_MAX) (default 0)
   a2                <double>     ..F.A....T. (from INT_MIN to INT_MAX) (default 0)
   b0                <double>     ..F.A....T. (from INT_MIN to INT_MAX) (default 0)
   b1                <double>     ..F.A....T. (from INT_MIN to INT_MAX) (default 0)
   b2                <double>     ..F.A....T. (from INT_MIN to INT_MAX) (default 0)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: bs2b
==============================
Filter bs2b
  Bauer stereo-to-binaural filter.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
bs2b AVOptions:
   profile           <int>        ..F.A...... Apply a pre-defined crossfeed level (from 0 to INT_MAX) (default default)
     default         2949820      ..F.A...... default profile
     cmoy            3932860      ..F.A...... Chu Moy circuit
     jmeier          6226570      ..F.A...... Jan Meier circuit
   fcut              <int>        ..F.A...... Set cut frequency (in Hz) (from 0 to 2000) (default 0)
   feed              <int>        ..F.A...... Set feed level (in Hz) (from 0 to 150) (default 0)


Exiting with exit code 0

==============================
FILTER: channelmap
==============================
Filter channelmap
  Remap audio channels.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
channelmap AVOptions:
   map               <string>     ..F.A...... A comma-separated list of input channel numbers in output order.
   channel_layout    <channel_layout> ..F.A...... Output channel layout.


Exiting with exit code 0

==============================
FILTER: channelsplit
==============================
Filter channelsplit
  Split audio into per-channel streams.
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
channelsplit AVOptions:
   channel_layout    <channel_layout> ..F.A...... Input channel layout. (default "stereo")
   channels          <string>     ..F.A...... Channels to extract. (default "all")


Exiting with exit code 0

==============================
FILTER: chorus
==============================
Filter chorus
  Add a chorus effect to the audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
chorus AVOptions:
   in_gain           <float>      ..F.A...... set input gain (from 0 to 1) (default 0.4)
   out_gain          <float>      ..F.A...... set output gain (from 0 to 1) (default 0.4)
   delays            <string>     ..F.A...... set delays
   decays            <string>     ..F.A...... set decays
   speeds            <string>     ..F.A...... set speeds
   depths            <string>     ..F.A...... set depths


Exiting with exit code 0

==============================
FILTER: compand
==============================
Filter compand
  Compress or expand audio dynamic range.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
compand AVOptions:
   attacks           <string>     ..F.A...... set time over which increase of volume is determined (default "0")
   decays            <string>     ..F.A...... set time over which decrease of volume is determined (default "0.8")
   points            <string>     ..F.A...... set points of transfer function (default "-70/-70|-60/-20|1/0")
   soft-knee         <double>     ..F.A...... set soft-knee (from 0.01 to 900) (default 0.01)
   gain              <double>     ..F.A...... set output gain (from -900 to 900) (default 0)
   volume            <double>     ..F.A...... set initial volume (from -900 to 0) (default 0)
   delay             <double>     ..F.A...... set delay for samples before sending them to volume adjuster (from 0 to 20) (default 0)


Exiting with exit code 0

==============================
FILTER: compensationdelay
==============================
Filter compensationdelay
  Audio Compensation Delay Line.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
compensationdelay AVOptions:
   mm                <int>        ..F.A....T. set mm distance (from 0 to 10) (default 0)
   cm                <int>        ..F.A....T. set cm distance (from 0 to 100) (default 0)
   m                 <int>        ..F.A....T. set meter distance (from 0 to 100) (default 0)
   dry               <double>     ..F.A....T. set dry amount (from 0 to 1) (default 0)
   wet               <double>     ..F.A....T. set wet amount (from 0 to 1) (default 1)
   temp              <int>        ..F.A....T. set temperature ┬░C (from -50 to 50) (default 20)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: crossfeed
==============================
Filter crossfeed
  Apply headphone crossfeed filter.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
crossfeed AVOptions:
   strength          <double>     ..F.A....T. set crossfeed strength (from 0 to 1) (default 0.2)
   range             <double>     ..F.A....T. set soundstage wideness (from 0 to 1) (default 0.5)
   slope             <double>     ..F.A....T. set curve slope (from 0.01 to 1) (default 0.5)
   level_in          <double>     ..F.A....T. set level in (from 0 to 1) (default 0.9)
   level_out         <double>     ..F.A....T. set level out (from 0 to 1) (default 1)
   block_size        <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: crystalizer
==============================
Filter crystalizer
  Simple audio noise sharpening filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
crystalizer AVOptions:
   i                 <float>      ..F.A....T. set intensity (from -10 to 10) (default 2)
   c                 <boolean>    ..F.A....T. enable clipping (default true)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: dcshift
==============================
Filter dcshift
  Apply a DC shift to the audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
dcshift AVOptions:
   shift             <double>     ..F.A...... set DC shift (from -1 to 1) (default 0)
   limitergain       <double>     ..F.A...... set limiter gain (from 0 to 1) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: deesser
==============================
Filter deesser
  Apply de-essing to the audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
deesser AVOptions:
   i                 <double>     ..F.A...... set intensity (from 0 to 1) (default 0)
   m                 <double>     ..F.A...... set max deessing (from 0 to 1) (default 0.5)
   f                 <double>     ..F.A...... set frequency (from 0 to 1) (default 0.5)
   s                 <int>        ..F.A...... set output mode (from 0 to 2) (default o)
     i               0            ..F.A...... input
     o               1            ..F.A...... output
     e               2            ..F.A...... ess

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: dialoguenhance
==============================
Filter dialoguenhance
  Audio Dialogue Enhancement.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
dialoguenhance AVOptions:
   original          <double>     ..F.A....T. set original center factor (from 0 to 1) (default 1)
   enhance           <double>     ..F.A....T. set dialogue enhance factor (from 0 to 3) (default 1)
   voice             <double>     ..F.A....T. set voice detection factor (from 2 to 32) (default 2)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: drmeter
==============================
Filter drmeter
  Measure audio dynamic range.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
drmeter AVOptions:
   length            <double>     ..F.A...... set the window length (from 0.01 to 10) (default 3)


Exiting with exit code 0

==============================
FILTER: dynaudnorm
==============================
Filter dynaudnorm
  Dynamic Audio Normalizer.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
dynaudnorm AVOptions:
   framelen          <int>        ..F.A....T. set the frame length in msec (from 10 to 8000) (default 500)
   f                 <int>        ..F.A....T. set the frame length in msec (from 10 to 8000) (default 500)
   gausssize         <int>        ..F.A....T. set the filter size (from 3 to 301) (default 31)
   g                 <int>        ..F.A....T. set the filter size (from 3 to 301) (default 31)
   peak              <double>     ..F.A....T. set the peak value (from 0 to 1) (default 0.95)
   p                 <double>     ..F.A....T. set the peak value (from 0 to 1) (default 0.95)
   maxgain           <double>     ..F.A....T. set the max amplification (from 1 to 100) (default 10)
   m                 <double>     ..F.A....T. set the max amplification (from 1 to 100) (default 10)
   targetrms         <double>     ..F.A....T. set the target RMS (from 0 to 1) (default 0)
   r                 <double>     ..F.A....T. set the target RMS (from 0 to 1) (default 0)
   coupling          <boolean>    ..F.A....T. set channel coupling (default true)
   n                 <boolean>    ..F.A....T. set channel coupling (default true)
   correctdc         <boolean>    ..F.A....T. set DC correction (default false)
   c                 <boolean>    ..F.A....T. set DC correction (default false)
   altboundary       <boolean>    ..F.A....T. set alternative boundary mode (default false)
   b                 <boolean>    ..F.A....T. set alternative boundary mode (default false)
   compress          <double>     ..F.A....T. set the compress factor (from 0 to 30) (default 0)
   s                 <double>     ..F.A....T. set the compress factor (from 0 to 30) (default 0)
   threshold         <double>     ..F.A....T. set the threshold value (from 0 to 1) (default 0)
   t                 <double>     ..F.A....T. set the threshold value (from 0 to 1) (default 0)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   h                 <string>     ..F.A....T. set channels to filter (default "all")
   overlap           <double>     ..F.A....T. set the frame overlap (from 0 to 1) (default 0)
   o                 <double>     ..F.A....T. set the frame overlap (from 0 to 1) (default 0)
   curve             <string>     ..F.A....T. set the custom peak mapping curve
   v                 <string>     ..F.A....T. set the custom peak mapping curve

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: earwax
==============================
Filter earwax
  Widen the stereo image.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)

Exiting with exit code 0

==============================
FILTER: ebur128
==============================
Filter ebur128
  EBU R128 scanner.
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
ebur128 AVOptions:
   video             <boolean>    ..FV....... set video output (default false)
   size              <image_size> ..FV....... set video size (default "640x480")
   meter             <int>        ..FV....... set scale meter (+9 to +18) (from 9 to 18) (default 9)
   framelog          <int>        ..FVA...... force frame logging level (from INT_MIN to INT_MAX) (default -1)
     quiet           -8           ..FVA...... logging disabled
     info            32           ..FVA...... information logging level
     verbose         40           ..FVA...... verbose logging level
   metadata          <boolean>    ..FVA...... inject metadata in the filtergraph (default false)
   peak              <flags>      ..F.A...... set peak mode (default 0)
     none                         ..F.A...... disable any peak mode
     sample                       ..F.A...... enable peak-sample mode
     true                         ..F.A...... enable true-peak mode
   dualmono          <boolean>    ..F.A...... treat mono input files as dual-mono (default false)
   panlaw            <double>     ..F.A...... set a specific pan law for dual-mono files (from -10 to 0) (default -3.0103)
   target            <int>        ..FV....... set a specific target level in LUFS (-23 to 0) (from -23 to 0) (default -23)
   gauge             <int>        ..FV....... set gauge display type (from 0 to 1) (default momentary)
     momentary       0            ..FV....... display momentary value
     m               0            ..FV....... display momentary value
     shortterm       1            ..FV....... display short-term value
     s               1            ..FV....... display short-term value
   scale             <int>        ..FV....... sets display method for the stats (from 0 to 1) (default absolute)
     absolute        0            ..FV....... display absolute values (LUFS)
     LUFS            0            ..FV....... display absolute values (LUFS)
     relative        1            ..FV....... display values relative to target (LU)
     LU              1            ..FV....... display values relative to target (LU)
   integrated        <double>     ..F.A.XR... integrated loudness (LUFS) (from -DBL_MAX to DBL_MAX) (default 0)
   range             <double>     ..F.A.XR... loudness range (LU) (from -DBL_MAX to DBL_MAX) (default 0)
   lra_low           <double>     ..F.A.XR... LRA low (LUFS) (from -DBL_MAX to DBL_MAX) (default 0)
   lra_high          <double>     ..F.A.XR... LRA high (LUFS) (from -DBL_MAX to DBL_MAX) (default 0)
   sample_peak       <double>     ..F.A.XR... sample peak (dBFS) (from -DBL_MAX to DBL_MAX) (default 0)
   true_peak         <double>     ..F.A.XR... true peak (dBFS) (from -DBL_MAX to DBL_MAX) (default 0)


Exiting with exit code 0

==============================
FILTER: equalizer
==============================
Filter equalizer
  Apply two-pole peaking equalization (EQ) filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
equalizer AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 0)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 0)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 1)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 1)
   gain              <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   g                 <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: extrastereo
==============================
Filter extrastereo
  Increase difference between stereo audio channels.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
extrastereo AVOptions:
   m                 <float>      ..F.A....T. set the difference coefficient (from -10 to 10) (default 2.5)
   c                 <boolean>    ..F.A....T. enable clipping (default true)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: firequalizer
==============================
Filter firequalizer
  Finite Impulse Response Equalizer.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
firequalizer AVOptions:
   gain              <string>     ..F.A....T. set gain curve (default "gain_interpolate(f)")
   gain_entry        <string>     ..F.A....T. set gain entry
   delay             <double>     ..F.A...... set delay (from 0 to 1e+10) (default 0.01)
   accuracy          <double>     ..F.A...... set accuracy (from 0 to 1e+10) (default 5)
   wfunc             <int>        ..F.A...... set window function (from 0 to 9) (default hann)
     rectangular     0            ..F.A...... rectangular window
     hann            1            ..F.A...... hann window
     hamming         2            ..F.A...... hamming window
     blackman        3            ..F.A...... blackman window
     nuttall3        4            ..F.A...... 3-term nuttall window
     mnuttall3       5            ..F.A...... minimum 3-term nuttall window
     nuttall         6            ..F.A...... nuttall window
     bnuttall        7            ..F.A...... blackman-nuttall window
     bharris         8            ..F.A...... blackman-harris window
     tukey           9            ..F.A...... tukey window
   fixed             <boolean>    ..F.A...... set fixed frame samples (default false)
   multi             <boolean>    ..F.A...... set multi channels mode (default false)
   zero_phase        <boolean>    ..F.A...... set zero phase mode (default false)
   scale             <int>        ..F.A...... set gain scale (from 0 to 3) (default linlog)
     linlin          0            ..F.A...... linear-freq linear-gain
     linlog          1            ..F.A...... linear-freq logarithmic-gain
     loglin          2            ..F.A...... logarithmic-freq linear-gain
     loglog          3            ..F.A...... logarithmic-freq logarithmic-gain
   dumpfile          <string>     ..F.A...... set dump file
   dumpscale         <int>        ..F.A...... set dump scale (from 0 to 3) (default linlog)
     linlin          0            ..F.A...... linear-freq linear-gain
     linlog          1            ..F.A...... linear-freq logarithmic-gain
     loglin          2            ..F.A...... logarithmic-freq linear-gain
     loglog          3            ..F.A...... logarithmic-freq logarithmic-gain
   fft2              <boolean>    ..F.A...... set 2-channels fft (default false)
   min_phase         <boolean>    ..F.A...... set minimum phase mode (default false)


Exiting with exit code 0

==============================
FILTER: flanger
==============================
Filter flanger
  Apply a flanging effect to the audio.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
flanger AVOptions:
   delay             <double>     ..F.A...... base delay in milliseconds (from 0 to 30) (default 0)
   depth             <double>     ..F.A...... added swept delay in milliseconds (from 0 to 10) (default 2)
   regen             <double>     ..F.A...... percentage regeneration (delayed signal feedback) (from -95 to 95) (default 0)
   width             <double>     ..F.A...... percentage of delayed signal mixed with original (from 0 to 100) (default 71)
   speed             <double>     ..F.A...... sweeps per second (Hz) (from 0.1 to 10) (default 0.5)
   shape             <int>        ..F.A...... swept wave shape (from 0 to 1) (default sinusoidal)
     triangular      1            ..F.A......
     t               1            ..F.A......
     sinusoidal      0            ..F.A......
     s               0            ..F.A......
   phase             <double>     ..F.A...... swept wave percentage phase-shift for multi-channel (from 0 to 100) (default 25)
   interp            <int>        ..F.A...... delay-line interpolation (from 0 to 1) (default linear)
     linear          0            ..F.A......
     quadratic       1            ..F.A......


Exiting with exit code 0

==============================
FILTER: haas
==============================
Filter haas
  Apply Haas Stereo Enhancer.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
haas AVOptions:
   level_in          <double>     ..F.A...... set level in (from 0.015625 to 64) (default 1)
   level_out         <double>     ..F.A...... set level out (from 0.015625 to 64) (default 1)
   side_gain         <double>     ..F.A...... set side gain (from 0.015625 to 64) (default 1)
   middle_source     <int>        ..F.A...... set middle source (from 0 to 3) (default mid)
     left            0            ..F.A......
     right           1            ..F.A......
     mid             2            ..F.A...... L+R
     side            3            ..F.A...... L-R
   middle_phase      <boolean>    ..F.A...... set middle phase (default false)
   left_delay        <double>     ..F.A...... set left delay (from 0 to 40) (default 2.05)
   left_balance      <double>     ..F.A...... set left balance (from -1 to 1) (default -1)
   left_gain         <double>     ..F.A...... set left gain (from 0.015625 to 64) (default 1)
   left_phase        <boolean>    ..F.A...... set left phase (default false)
   right_delay       <double>     ..F.A...... set right delay (from 0 to 40) (default 2.12)
   right_balance     <double>     ..F.A...... set right balance (from -1 to 1) (default 1)
   right_gain        <double>     ..F.A...... set right gain (from 0.015625 to 64) (default 1)
   right_phase       <boolean>    ..F.A...... set right phase (default true)


Exiting with exit code 0

==============================
FILTER: hdcd
==============================
Filter hdcd
  Apply High Definition Compatible Digital (HDCD) decoding.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
hdcd AVOptions:
   disable_autoconvert <boolean>    ..F.A...... Disable any format conversion or resampling in the filter graph. (default true)
   process_stereo    <boolean>    ..F.A...... Process stereo channels together. Only apply target_gain when both channels match. (default true)
   cdt_ms            <int>        ..F.A...... Code detect timer period in ms. (from 100 to 60000) (default 2000)
   force_pe          <boolean>    ..F.A...... Always extend peaks above -3dBFS even when PE is not signaled. (default false)
   analyze_mode      <int>        ..F.A...... Replace audio with solid tone and signal some processing aspect in the amplitude. (from 0 to 4) (default off)
     off             0            ..F.A...... disabled
     lle             1            ..F.A...... gain adjustment level at each sample
     pe              2            ..F.A...... samples where peak extend occurs
     cdt             3            ..F.A...... samples where the code detect timer is active
     tgm             4            ..F.A...... samples where the target gain does not match between channels
   bits_per_sample   <int>        ..F.A...... Valid bits per sample (location of the true LSB). (from 16 to 24) (default 16)
     16              16           ..F.A...... 16-bit (in s32 or s16)
     20              20           ..F.A...... 20-bit (in s32)
     24              24           ..F.A...... 24-bit (in s32)


Exiting with exit code 0

==============================
FILTER: headphone
==============================
Filter headphone
  Apply headphone binaural spatialization with HRTFs in additional streams.
    slice threading supported
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
headphone AVOptions:
   map               <string>     ..F.A...... set channels convolution mappings
   gain              <float>      ..F.A...... set gain in dB (from -20 to 40) (default 0)
   lfe               <float>      ..F.A...... set lfe gain in dB (from -20 to 40) (default 0)
   type              <int>        ..F.A...... set processing (from 0 to 1) (default freq)
     time            0            ..F.A...... time domain
     freq            1            ..F.A...... frequency domain
   size              <int>        ..F.A...... set frame size (from 1024 to 96000) (default 1024)
   hrir              <int>        ..F.A...... set hrir format (from 0 to 1) (default stereo)
     stereo          0            ..F.A...... hrir files have exactly 2 channels
     multich         1            ..F.A...... single multichannel hrir file


Exiting with exit code 0

==============================
FILTER: highpass
==============================
Filter highpass
  Apply a high-pass filter with 3dB point frequency.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
highpass AVOptions:
   frequency         <double>     ..F.A....T. set frequency (from 0 to 999999) (default 3000)
   f                 <double>     ..F.A....T. set frequency (from 0 to 999999) (default 3000)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.707)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.707)
   poles             <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   p                 <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: highshelf
==============================
Filter highshelf
  Apply a high shelf filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
treble/high/tiltshelf AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   gain              <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   g                 <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   poles             <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   p                 <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: join
==============================
Filter join
  Join multiple audio streams into multi-channel output.
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
join AVOptions:
   inputs            <int>        ..F.A...... Number of input streams. (from 1 to INT_MAX) (default 2)
   channel_layout    <channel_layout> ..F.A...... Channel layout of the output stream. (default "stereo")
   map               <string>     ..F.A...... A comma-separated list of channels maps in the format 'input_stream.input_channel-output_channel.


Exiting with exit code 0

==============================
FILTER: ladspa
==============================
Filter ladspa
  Apply LADSPA effect.
    Inputs:
        dynamic (depending on the options)
    Outputs:
       #0: default (audio)
ladspa AVOptions:
   file              <string>     ..F.A...... set library name or full path
   f                 <string>     ..F.A...... set library name or full path
   plugin            <string>     ..F.A...... set plugin name
   p                 <string>     ..F.A...... set plugin name
   controls          <string>     ..F.A...... set plugin options
   c                 <string>     ..F.A...... set plugin options
   sample_rate       <int>        ..F.A...... set sample rate (from 1 to INT_MAX) (default 44100)
   s                 <int>        ..F.A...... set sample rate (from 1 to INT_MAX) (default 44100)
   nb_samples        <int>        ..F.A...... set the number of samples per requested frame (from 1 to INT_MAX) (default 1024)
   n                 <int>        ..F.A...... set the number of samples per requested frame (from 1 to INT_MAX) (default 1024)
   duration          <duration>   ..F.A...... set audio duration (default -0.000001)
   d                 <duration>   ..F.A...... set audio duration (default -0.000001)
   latency           <boolean>    ..F.A...... enable latency compensation (default false)
   l                 <boolean>    ..F.A...... enable latency compensation (default false)


Exiting with exit code 0

==============================
FILTER: loudnorm
==============================
Filter loudnorm
  EBU R128 loudness normalization
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
loudnorm AVOptions:
   I                 <double>     ..F.A...... set integrated loudness target (from -70 to -5) (default -24)
   i                 <double>     ..F.A...... set integrated loudness target (from -70 to -5) (default -24)
   LRA               <double>     ..F.A...... set loudness range target (from 1 to 50) (default 7)
   lra               <double>     ..F.A...... set loudness range target (from 1 to 50) (default 7)
   TP                <double>     ..F.A...... set maximum true peak (from -9 to 0) (default -2)
   tp                <double>     ..F.A...... set maximum true peak (from -9 to 0) (default -2)
   measured_I        <double>     ..F.A...... measured IL of input file (from -99 to 0) (default 0)
   measured_i        <double>     ..F.A...... measured IL of input file (from -99 to 0) (default 0)
   measured_LRA      <double>     ..F.A...... measured LRA of input file (from 0 to 99) (default 0)
   measured_lra      <double>     ..F.A...... measured LRA of input file (from 0 to 99) (default 0)
   measured_TP       <double>     ..F.A...... measured true peak of input file (from -99 to 99) (default 99)
   measured_tp       <double>     ..F.A...... measured true peak of input file (from -99 to 99) (default 99)
   measured_thresh   <double>     ..F.A...... measured threshold of input file (from -99 to 0) (default -70)
   offset            <double>     ..F.A...... set offset gain (from -99 to 99) (default 0)
   linear            <boolean>    ..F.A...... normalize linearly if possible (default true)
   dual_mono         <boolean>    ..F.A...... treat mono input as dual-mono (default false)
   print_format      <int>        ..F.A...... set print format for stats (from 0 to 2) (default none)
     none            0            ..F.A......
     json            1            ..F.A......
     summary         2            ..F.A......
   stats_file        <string>     ..F.A...... set stats output file


Exiting with exit code 0

==============================
FILTER: lowpass
==============================
Filter lowpass
  Apply a low-pass filter with 3dB point frequency.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
lowpass AVOptions:
   frequency         <double>     ..F.A....T. set frequency (from 0 to 999999) (default 500)
   f                 <double>     ..F.A....T. set frequency (from 0 to 999999) (default 500)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.707)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.707)
   poles             <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   p                 <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: lowshelf
==============================
Filter lowshelf
  Apply a low shelf filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
bass/lowshelf AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 100)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 100)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   gain              <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   g                 <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   poles             <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   p                 <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: mcompand
==============================
Filter mcompand
  Multiband Compress or expand audio dynamic range.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
mcompand AVOptions:
   args              <string>     ..F.A...... set parameters for each band (default "0.005,0.1 6 -47/-40,-34/-34,-17/-33 100 | 0.003,0.05 6 -47/-40,-34/-34,-17/-33 400 | 0.000625,0.0125 6 -47/-40,-34/-34,-15/-33 1600 | 0.0001,0.025 6 -47/-40,-34/-34,-31/-31,-0/-30 6400 | 0,0.025 6 -38/-31,-28/-28,-0/-25 22000")


Exiting with exit code 0

==============================
FILTER: pan
==============================
Filter pan
  Remix channels with coefficients (panning).
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
pan AVOptions:
   args              <string>     ..F.A......


Exiting with exit code 0

==============================
FILTER: replaygain
==============================
Filter replaygain
  ReplayGain scanner.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
replaygain AVOptions:
   track_gain        <float>      ..F.A.XR... track gain (dB) (from -FLT_MAX to FLT_MAX) (default 0)
   track_peak        <float>      ..F.A.XR... track peak (from -FLT_MAX to FLT_MAX) (default 0)


Exiting with exit code 0

==============================
FILTER: rubberband
==============================
Filter rubberband
  Apply time-stretching and pitch-shifting.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
rubberband AVOptions:
   tempo             <double>     ..F.A....T. set tempo scale factor (from 0.01 to 100) (default 1)
   pitch             <double>     ..F.A....T. set pitch scale factor (from 0.01 to 100) (default 1)
   transients        <int>        ..F.A...... set transients (from 0 to INT_MAX) (default crisp)
     crisp           0            ..F.A......
     mixed           256          ..F.A......
     smooth          512          ..F.A......
   detector          <int>        ..F.A...... set detector (from 0 to INT_MAX) (default compound)
     compound        0            ..F.A......
     percussive      1024         ..F.A......
     soft            2048         ..F.A......
   phase             <int>        ..F.A...... set phase (from 0 to INT_MAX) (default laminar)
     laminar         0            ..F.A......
     independent     8192         ..F.A......
   window            <int>        ..F.A...... set window (from 0 to INT_MAX) (default standard)
     standard        0            ..F.A......
     short           1048576      ..F.A......
     long            2097152      ..F.A......
   smoothing         <int>        ..F.A...... set smoothing (from 0 to INT_MAX) (default off)
     off             0            ..F.A......
     on              8388608      ..F.A......
   formant           <int>        ..F.A...... set formant (from 0 to INT_MAX) (default shifted)
     shifted         0            ..F.A......
     preserved       16777216     ..F.A......
   pitchq            <int>        ..F.A...... set pitch quality (from 0 to INT_MAX) (default quality)
     quality         0            ..F.A......
     speed           33554432     ..F.A......
     consistency     67108864     ..F.A......
   channels          <int>        ..F.A...... set channels (from 0 to INT_MAX) (default apart)
     apart           0            ..F.A......
     together        268435456    ..F.A......


Exiting with exit code 0

==============================
FILTER: silencedetect
==============================
Filter silencedetect
  Detect silence.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
silencedetect AVOptions:
   n                 <double>     ..F.A...... set noise tolerance (from 0 to DBL_MAX) (default 0.001)
   noise             <double>     ..F.A...... set noise tolerance (from 0 to DBL_MAX) (default 0.001)
   d                 <duration>   ..F.A...... set minimum duration in seconds (default 2)
   duration          <duration>   ..F.A...... set minimum duration in seconds (default 2)
   mono              <boolean>    ..F.A...... check each channel separately (default false)
   m                 <boolean>    ..F.A...... check each channel separately (default false)


Exiting with exit code 0

==============================
FILTER: silenceremove
==============================
Filter silenceremove
  Remove silence.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
silenceremove AVOptions:
   start_periods     <int>        ..F.A...... set periods of silence parts to skip from start (from 0 to 9000) (default 0)
   start_duration    <duration>   ..F.A...... set start duration of non-silence part (default 0)
   start_threshold   <double>     ..F.A....T. set threshold for start silence detection (from 0 to DBL_MAX) (default 0)
   start_silence     <duration>   ..F.A...... set start duration of silence part to keep (default 0)
   start_mode        <int>        ..F.A....T. set which channel will trigger trimming from start (from 0 to 1) (default any)
     any             0            ..F.A....T.
     all             1            ..F.A....T.
   stop_periods      <int>        ..F.A...... set periods of silence parts to skip from end (from -9000 to 9000) (default 0)
   stop_duration     <duration>   ..F.A...... set stop duration of silence part (default 0)
   stop_threshold    <double>     ..F.A....T. set threshold for stop silence detection (from 0 to DBL_MAX) (default 0)
   stop_silence      <duration>   ..F.A...... set stop duration of silence part to keep (default 0)
   stop_mode         <int>        ..F.A....T. set which channel will trigger trimming from end (from 0 to 1) (default all)
     any             0            ..F.A....T.
     all             1            ..F.A....T.
   detection         <int>        ..F.A...... set how silence is detected (from 0 to 5) (default rms)
     avg             0            ..F.A...... use mean absolute values of samples
     rms             1            ..F.A...... use root mean squared values of samples
     peak            2            ..F.A...... use max absolute values of samples
     median          3            ..F.A...... use median of absolute values of samples
     ptp             4            ..F.A...... use absolute of max peak to min peak difference
     dev             5            ..F.A...... use standard deviation from values of samples
   window            <duration>   ..F.A...... set duration of window for silence detection (default 0.02)
   timestamp         <int>        ..F.A...... set how every output frame timestamp is processed (from 0 to 1) (default write)
     write           0            ..F.A...... full timestamps rewrite, keep only the start time
     copy            1            ..F.A...... non-dropped frames are left with same timestamp

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: sofalizer
==============================
Filter sofalizer
  SOFAlizer (Spatially Oriented Format for Acoustics).
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
sofalizer AVOptions:
   sofa              <string>     ..F.A...... sofa filename
   gain              <float>      ..F.A...... set gain in dB (from -20 to 40) (default 0)
   rotation          <float>      ..F.A...... set rotation (from -360 to 360) (default 0)
   elevation         <float>      ..F.A...... set elevation (from -90 to 90) (default 0)
   radius            <float>      ..F.A...... set radius (from 0 to 5) (default 1)
   type              <int>        ..F.A...... set processing (from 0 to 1) (default freq)
     time            0            ..F.A...... time domain
     freq            1            ..F.A...... frequency domain
   speakers          <string>     ..F.A...... set speaker custom positions
   lfegain           <float>      ..F.A...... set lfe gain (from -20 to 40) (default 0)
   framesize         <int>        ..F.A...... set frame size (from 1024 to 96000) (default 1024)
   normalize         <boolean>    ..F.A...... normalize IRs (default true)
   interpolate       <boolean>    ..F.A...... interpolate IRs from neighbors (default false)
   minphase          <boolean>    ..F.A...... minphase IRs (default false)
   anglestep         <float>      ..F.A...... set neighbor search angle step (from 0.01 to 10) (default 0.5)
   radstep           <float>      ..F.A...... set neighbor search radius step (from 0.01 to 1) (default 0.01)


Exiting with exit code 0

==============================
FILTER: speechnorm
==============================
Filter speechnorm
  Speech Normalizer.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
speechnorm AVOptions:
   peak              <double>     ..F.A....T. set the peak value (from 0 to 1) (default 0.95)
   p                 <double>     ..F.A....T. set the peak value (from 0 to 1) (default 0.95)
   expansion         <double>     ..F.A....T. set the max expansion factor (from 1 to 50) (default 2)
   e                 <double>     ..F.A....T. set the max expansion factor (from 1 to 50) (default 2)
   compression       <double>     ..F.A....T. set the max compression factor (from 1 to 50) (default 2)
   c                 <double>     ..F.A....T. set the max compression factor (from 1 to 50) (default 2)
   threshold         <double>     ..F.A....T. set the threshold value (from 0 to 1) (default 0)
   t                 <double>     ..F.A....T. set the threshold value (from 0 to 1) (default 0)
   raise             <double>     ..F.A....T. set the expansion raising amount (from 0 to 1) (default 0.001)
   r                 <double>     ..F.A....T. set the expansion raising amount (from 0 to 1) (default 0.001)
   fall              <double>     ..F.A....T. set the compression raising amount (from 0 to 1) (default 0.001)
   f                 <double>     ..F.A....T. set the compression raising amount (from 0 to 1) (default 0.001)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   h                 <string>     ..F.A....T. set channels to filter (default "all")
   invert            <boolean>    ..F.A....T. set inverted filtering (default false)
   i                 <boolean>    ..F.A....T. set inverted filtering (default false)
   link              <boolean>    ..F.A....T. set linked channels filtering (default false)
   l                 <boolean>    ..F.A....T. set linked channels filtering (default false)
   rms               <double>     ..F.A....T. set the RMS value (from 0 to 1) (default 0)
   m                 <double>     ..F.A....T. set the RMS value (from 0 to 1) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: stereotools
==============================
Filter stereotools
  Apply various stereo tools.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
stereotools AVOptions:
   level_in          <double>     ..F.A....T. set level in (from 0.015625 to 64) (default 1)
   level_out         <double>     ..F.A....T. set level out (from 0.015625 to 64) (default 1)
   balance_in        <double>     ..F.A....T. set balance in (from -1 to 1) (default 0)
   balance_out       <double>     ..F.A....T. set balance out (from -1 to 1) (default 0)
   softclip          <boolean>    ..F.A....T. enable softclip (default false)
   mutel             <boolean>    ..F.A....T. mute L (default false)
   muter             <boolean>    ..F.A....T. mute R (default false)
   phasel            <boolean>    ..F.A....T. phase L (default false)
   phaser            <boolean>    ..F.A....T. phase R (default false)
   mode              <int>        ..F.A....T. set stereo mode (from 0 to 10) (default lr>lr)
     lr>lr           0            ..F.A....T.
     lr>ms           1            ..F.A....T.
     ms>lr           2            ..F.A....T.
     lr>ll           3            ..F.A....T.
     lr>rr           4            ..F.A....T.
     lr>l+r          5            ..F.A....T.
     lr>rl           6            ..F.A....T.
     ms>ll           7            ..F.A....T.
     ms>rr           8            ..F.A....T.
     ms>rl           9            ..F.A....T.
     lr>l-r          10           ..F.A....T.
   slev              <double>     ..F.A....T. set side level (from 0.015625 to 64) (default 1)
   sbal              <double>     ..F.A....T. set side balance (from -1 to 1) (default 0)
   mlev              <double>     ..F.A....T. set middle level (from 0.015625 to 64) (default 1)
   mpan              <double>     ..F.A....T. set middle pan (from -1 to 1) (default 0)
   base              <double>     ..F.A....T. set stereo base (from -1 to 1) (default 0)
   delay             <double>     ..F.A....T. set delay (from -20 to 20) (default 0)
   sclevel           <double>     ..F.A....T. set S/C level (from 1 to 100) (default 1)
   phase             <double>     ..F.A....T. set stereo phase (from 0 to 360) (default 0)
   bmode_in          <int>        ..F.A....T. set balance in mode (from 0 to 2) (default balance)
     balance         0            ..F.A....T.
     amplitude       1            ..F.A....T.
     power           2            ..F.A....T.
   bmode_out         <int>        ..F.A....T. set balance out mode (from 0 to 2) (default balance)
     balance         0            ..F.A....T.
     amplitude       1            ..F.A....T.
     power           2            ..F.A....T.

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: stereowiden
==============================
Filter stereowiden
  Apply stereo widening effect.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
stereowiden AVOptions:
   delay             <float>      ..F.A...... set delay time (from 1 to 100) (default 20)
   feedback          <float>      ..F.A....T. set feedback gain (from 0 to 0.9) (default 0.3)
   crossfeed         <float>      ..F.A....T. set cross feed (from 0 to 0.8) (default 0.3)
   drymix            <float>      ..F.A....T. set dry-mix (from 0 to 1) (default 0.8)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: superequalizer
==============================
Filter superequalizer
  Apply 18 band equalization filter.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
superequalizer AVOptions:
   1b                <float>      ..F.A...... set 65Hz band gain (from 0 to 20) (default 1)
   2b                <float>      ..F.A...... set 92Hz band gain (from 0 to 20) (default 1)
   3b                <float>      ..F.A...... set 131Hz band gain (from 0 to 20) (default 1)
   4b                <float>      ..F.A...... set 185Hz band gain (from 0 to 20) (default 1)
   5b                <float>      ..F.A...... set 262Hz band gain (from 0 to 20) (default 1)
   6b                <float>      ..F.A...... set 370Hz band gain (from 0 to 20) (default 1)
   7b                <float>      ..F.A...... set 523Hz band gain (from 0 to 20) (default 1)
   8b                <float>      ..F.A...... set 740Hz band gain (from 0 to 20) (default 1)
   9b                <float>      ..F.A...... set 1047Hz band gain (from 0 to 20) (default 1)
   10b               <float>      ..F.A...... set 1480Hz band gain (from 0 to 20) (default 1)
   11b               <float>      ..F.A...... set 2093Hz band gain (from 0 to 20) (default 1)
   12b               <float>      ..F.A...... set 2960Hz band gain (from 0 to 20) (default 1)
   13b               <float>      ..F.A...... set 4186Hz band gain (from 0 to 20) (default 1)
   14b               <float>      ..F.A...... set 5920Hz band gain (from 0 to 20) (default 1)
   15b               <float>      ..F.A...... set 8372Hz band gain (from 0 to 20) (default 1)
   16b               <float>      ..F.A...... set 11840Hz band gain (from 0 to 20) (default 1)
   17b               <float>      ..F.A...... set 16744Hz band gain (from 0 to 20) (default 1)
   18b               <float>      ..F.A...... set 20000Hz band gain (from 0 to 20) (default 1)


Exiting with exit code 0

==============================
FILTER: surround
==============================
Filter surround
  Apply audio surround upmix filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
surround AVOptions:
   chl_out           <channel_layout> ..F.A...... set output channel layout (default "5.1")
   chl_in            <channel_layout> ..F.A...... set input channel layout (default "stereo")
   level_in          <float>      ..F.A....T. set input level (from 0 to 10) (default 1)
   level_out         <float>      ..F.A....T. set output level (from 0 to 10) (default 1)
   lfe               <boolean>    ..F.A....T. output LFE (default true)
   lfe_low           <int>        ..F.A...... LFE low cut off (from 0 to 256) (default 128)
   lfe_high          <int>        ..F.A...... LFE high cut off (from 0 to 512) (default 256)
   lfe_mode          <int>        ..F.A....T. set LFE channel mode (from 0 to 1) (default add)
     add             0            ..F.A....T. just add LFE channel
     sub             1            ..F.A....T. subtract LFE channel with others
   smooth            <float>      ..F.A....T. set temporal smoothness strength (from 0 to 1) (default 0)
   angle             <float>      ..F.A....T. set soundfield transform angle (from 0 to 360) (default 90)
   focus             <float>      ..F.A....T. set soundfield transform focus (from -1 to 1) (default 0)
   fc_in             <float>      ..F.A....T. set front center channel input level (from 0 to 10) (default 1)
   fc_out            <float>      ..F.A....T. set front center channel output level (from 0 to 10) (default 1)
   fl_in             <float>      ..F.A....T. set front left channel input level (from 0 to 10) (default 1)
   fl_out            <float>      ..F.A....T. set front left channel output level (from 0 to 10) (default 1)
   fr_in             <float>      ..F.A....T. set front right channel input level (from 0 to 10) (default 1)
   fr_out            <float>      ..F.A....T. set front right channel output level (from 0 to 10) (default 1)
   sl_in             <float>      ..F.A....T. set side left channel input level (from 0 to 10) (default 1)
   sl_out            <float>      ..F.A....T. set side left channel output level (from 0 to 10) (default 1)
   sr_in             <float>      ..F.A....T. set side right channel input level (from 0 to 10) (default 1)
   sr_out            <float>      ..F.A....T. set side right channel output level (from 0 to 10) (default 1)
   bl_in             <float>      ..F.A....T. set back left channel input level (from 0 to 10) (default 1)
   bl_out            <float>      ..F.A....T. set back left channel output level (from 0 to 10) (default 1)
   br_in             <float>      ..F.A....T. set back right channel input level (from 0 to 10) (default 1)
   br_out            <float>      ..F.A....T. set back right channel output level (from 0 to 10) (default 1)
   bc_in             <float>      ..F.A....T. set back center channel input level (from 0 to 10) (default 1)
   bc_out            <float>      ..F.A....T. set back center channel output level (from 0 to 10) (default 1)
   lfe_in            <float>      ..F.A....T. set lfe channel input level (from 0 to 10) (default 1)
   lfe_out           <float>      ..F.A....T. set lfe channel output level (from 0 to 10) (default 1)
   allx              <float>      ..F.A....T. set all channel's x spread (from -1 to 15) (default -1)
   ally              <float>      ..F.A....T. set all channel's y spread (from -1 to 15) (default -1)
   fcx               <float>      ..F.A....T. set front center channel x spread (from 0.06 to 15) (default 0.5)
   flx               <float>      ..F.A....T. set front left channel x spread (from 0.06 to 15) (default 0.5)
   frx               <float>      ..F.A....T. set front right channel x spread (from 0.06 to 15) (default 0.5)
   blx               <float>      ..F.A....T. set back left channel x spread (from 0.06 to 15) (default 0.5)
   brx               <float>      ..F.A....T. set back right channel x spread (from 0.06 to 15) (default 0.5)
   slx               <float>      ..F.A....T. set side left channel x spread (from 0.06 to 15) (default 0.5)
   srx               <float>      ..F.A....T. set side right channel x spread (from 0.06 to 15) (default 0.5)
   bcx               <float>      ..F.A....T. set back center channel x spread (from 0.06 to 15) (default 0.5)
   fcy               <float>      ..F.A....T. set front center channel y spread (from 0.06 to 15) (default 0.5)
   fly               <float>      ..F.A....T. set front left channel y spread (from 0.06 to 15) (default 0.5)
   fry               <float>      ..F.A....T. set front right channel y spread (from 0.06 to 15) (default 0.5)
   bly               <float>      ..F.A....T. set back left channel y spread (from 0.06 to 15) (default 0.5)
   bry               <float>      ..F.A....T. set back right channel y spread (from 0.06 to 15) (default 0.5)
   sly               <float>      ..F.A....T. set side left channel y spread (from 0.06 to 15) (default 0.5)
   sry               <float>      ..F.A....T. set side right channel y spread (from 0.06 to 15) (default 0.5)
   bcy               <float>      ..F.A....T. set back center channel y spread (from 0.06 to 15) (default 0.5)
   win_size          <int>        ..F.A...... set window size (from 1024 to 65536) (default 4096)
   win_func          <int>        ..F.A...... set window function (from 0 to 20) (default hann)
     rect            0            ..F.A...... Rectangular
     bartlett        4            ..F.A...... Bartlett
     hann            1            ..F.A...... Hann
     hanning         1            ..F.A...... Hanning
     hamming         2            ..F.A...... Hamming
     blackman        3            ..F.A...... Blackman
     welch           5            ..F.A...... Welch
     flattop         6            ..F.A...... Flat-top
     bharris         7            ..F.A...... Blackman-Harris
     bnuttall        8            ..F.A...... Blackman-Nuttall
     bhann           11           ..F.A...... Bartlett-Hann
     sine            9            ..F.A...... Sine
     nuttall         10           ..F.A...... Nuttall
     lanczos         12           ..F.A...... Lanczos
     gauss           13           ..F.A...... Gauss
     tukey           14           ..F.A...... Tukey
     dolph           15           ..F.A...... Dolph-Chebyshev
     cauchy          16           ..F.A...... Cauchy
     parzen          17           ..F.A...... Parzen
     poisson         18           ..F.A...... Poisson
     bohman          19           ..F.A...... Bohman
     kaiser          20           ..F.A...... Kaiser
   overlap           <float>      ..F.A....T. set window overlap (from 0 to 1) (default 0.5)


Exiting with exit code 0

==============================
FILTER: tiltshelf
==============================
Filter tiltshelf
  Apply a tilt shelf filter.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
treble/high/tiltshelf AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   gain              <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   g                 <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   poles             <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   p                 <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: treble
==============================
Filter treble
  Boost or cut upper frequencies.
    slice threading supported
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
treble/high/tiltshelf AVOptions:
   frequency         <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   f                 <double>     ..F.A....T. set central frequency (from 0 to 999999) (default 3000)
   width_type        <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   t                 <int>        ..F.A....T. set filter-width type (from 1 to 5) (default q)
     h               1            ..F.A....T. Hz
     q               3            ..F.A....T. Q-Factor
     o               2            ..F.A....T. octave
     s               4            ..F.A....T. slope
     k               5            ..F.A....T. kHz
   width             <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   w                 <double>     ..F.A....T. set width (from 0 to 99999) (default 0.5)
   gain              <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   g                 <double>     ..F.A....T. set gain (from -900 to 900) (default 0)
   poles             <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   p                 <int>        ..F.A...... set number of poles (from 1 to 2) (default 2)
   mix               <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   m                 <double>     ..F.A....T. set mix (from 0 to 1) (default 1)
   channels          <string>     ..F.A....T. set channels to filter (default "all")
   c                 <string>     ..F.A....T. set channels to filter (default "all")
   normalize         <boolean>    ..F.A....T. normalize coefficients (default false)
   n                 <boolean>    ..F.A....T. normalize coefficients (default false)
   transform         <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   a                 <int>        ..F.A...... set transform type (from 0 to 6) (default di)
     di              0            ..F.A...... direct form I
     dii             1            ..F.A...... direct form II
     tdi             2            ..F.A...... transposed direct form I
     tdii            3            ..F.A...... transposed direct form II
     latt            4            ..F.A...... lattice-ladder form
     svf             5            ..F.A...... state variable filter form
     zdf             6            ..F.A...... zero-delay filter form
   precision         <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   r                 <int>        ..F.A...... set filtering precision (from -1 to 3) (default auto)
     auto            -1           ..F.A...... automatic
     s16             0            ..F.A...... signed 16-bit
     s32             1            ..F.A...... signed 32-bit
     f32             2            ..F.A...... floating-point single
     f64             3            ..F.A...... floating-point double
   blocksize         <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)
   b                 <int>        ..F.A...... set the block size (from 0 to 32768) (default 0)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: tremolo
==============================
Filter tremolo
  Apply tremolo effect.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
tremolo AVOptions:
   f                 <double>     ..F.A...... set frequency in hertz (from 0.1 to 20000) (default 5)
   d                 <double>     ..F.A...... set depth as percentage (from 0 to 1) (default 0.5)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: vibrato
==============================
Filter vibrato
  Apply vibrato effect.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
vibrato AVOptions:
   f                 <double>     ..F.A...... set frequency in hertz (from 0.1 to 20000) (default 5)
   d                 <double>     ..F.A...... set depth as percentage (from 0 to 1) (default 0.5)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: virtualbass
==============================
Filter virtualbass
  Audio Virtual Bass.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
virtualbass AVOptions:
   cutoff            <double>     ..F.A...... set virtual bass cutoff (from 100 to 500) (default 250)
   strength          <double>     ..F.A....T. set virtual bass strength (from 0.5 to 3) (default 3)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: volume
==============================
Filter volume
  Change input volume.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
volume AVOptions:
   volume            <string>     ..F.A....T. set volume adjustment expression (default "1.0")
   precision         <int>        ..F.A...... select mathematical precision (from 0 to 2) (default float)
     fixed           0            ..F.A...... select 8-bit fixed-point
     float           1            ..F.A...... select 32-bit floating-point
     double          2            ..F.A...... select 64-bit floating-point
   eval              <int>        ..F.A...... specify when to evaluate expressions (from 0 to 1) (default once)
     once            0            ..F.A...... eval volume expression once
     frame           1            ..F.A...... eval volume expression per-frame
   replaygain        <int>        ..F.A...... Apply replaygain side data when present (from 0 to 3) (default drop)
     drop            0            ..F.A...... replaygain side data is dropped
     ignore          1            ..F.A...... replaygain side data is ignored
     track           2            ..F.A...... track gain is preferred
     album           3            ..F.A...... album gain is preferred
   replaygain_preamp <double>     ..F.A...... Apply replaygain pre-amplification (from -15 to 15) (default 0)
   replaygain_noclip <boolean>    ..F.A...... Apply replaygain clipping prevention (default true)

This filter has support for timeline through the 'enable' option.

Exiting with exit code 0

==============================
FILTER: volumedetect
==============================
Filter volumedetect
  Detect audio volume.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)

Exiting with exit code 0

==============================
FILTER: whisper
==============================
Filter whisper
  Transcribe audio using whisper.cpp.
    Inputs:
       #0: default (audio)
    Outputs:
       #0: default (audio)
whisper AVOptions:
   model             <string>     ..F.A...... Path to the whisper.cpp model file
   language          <string>     ..F.A...... Language for transcription ('auto' for auto-detect) (default "auto")
   queue             <duration>   ..F.A...... Audio queue size (default 3)
   use_gpu           <boolean>    ..F.A...... Use GPU for processing (default true)
   gpu_device        <int>        ..F.A...... GPU device to use (from 0 to INT_MAX) (default 0)
   destination       <string>     ..F.A...... Output destination (default "")
   format            <string>     ..F.A...... Output format (text|srt|json) (default "text")
   max_len           <int>        ..F.A...... Max segment length in characters (from 0 to INT_MAX) (default 0)
   vad_model         <string>     ..F.A...... Path to the VAD model file
   vad_threshold     <float>      ..F.A...... VAD threshold (from 0 to 1) (default 0.5)
   vad_min_speech_duration <duration>   ..F.A...... Minimum speech duration for VAD (default 0.1)
   vad_min_silence_duration <duration>   ..F.A...... Minimum silence duration for VAD (default 0.5)


Exiting with exit code 0

==============================
FILTER: aphasemeter
==============================
Filter aphasemeter
  Convert input audio to phase meter video output.
    Inputs:
       #0: default (audio)
    Outputs:
        dynamic (depending on the options)
aphasemeter AVOptions:
   rate              <video_rate> ..FV....... set video rate (default "25")
   r                 <video_rate> ..FV....... set video rate (default "25")
   size              <image_size> ..FV....... set video size (default "800x400")
   s                 <image_size> ..FV....... set video size (default "800x400")
   rc                <int>        ..FV....... set red contrast (from 0 to 255) (default 2)
   gc                <int>        ..FV....... set green contrast (from 0 to 255) (default 7)
   bc                <int>        ..FV....... set blue contrast (from 0 to 255) (default 1)
   mpc               <string>     ..FV....... set median phase color (default "none")
   video             <boolean>    ..FV....... set video output (default true)
   phasing           <boolean>    ..FV....... set mono and out-of-phase detection output (default false)
   tolerance         <float>      ..FV....... set phase tolerance for mono detection (from 0 to 1) (default 0)
   t                 <float>      ..FV....... set phase tolerance for mono detection (from 0 to 1) (default 0)
   angle             <float>      ..FV....... set angle threshold for out-of-phase detection (from 90 to 180) (default 170)
   a                 <float>      ..FV....... set angle threshold for out-of-phase detection (from 90 to 180) (default 170)
   duration          <duration>   ..FV....... set minimum mono or out-of-phase duration in seconds (default 2)
   d                 <duration>   ..FV....... set minimum mono or out-of-phase duration in seconds (default 2)


Exiting with exit code 0
