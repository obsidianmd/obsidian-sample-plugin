# Markov Decision Process

Consider an agent situation in a **Markov** decision process, defined by some tuple $M=(\gamma,S,A,T,R)$, where $\gamma\in[0,1]$ is a discount factor, $S$ is a set of states, $A$ a set of actions, $T(s'|s,a)$ the probability of transitioning from $s$ to $s'$ after action $a$, and $R(s)$ the immediate expected reward in state $s$.

We typically consider scenarios where an agent prioritizes immediate over future rewards, formalized by **discounted return**.

## Value function
Our value function $V^{\pi}(s)$ is:
$$
V^\pi(s)=\mathbb{E}\left[\sum_{t=0}^H\gamma^tR(s_{t+1})|s_0=s\right]
$$

^ad35e2

We can also define a state-action value:
$$
Q^{\pi}(s,a)=\mathbb{E}\left[ \sum_{t=0}^{H}\gamma^{t}R(s_{t+1})|s_{0}=s,a_{0}=a \right]
$$
## Optimal policy
where the optimal policy $\pi^{*}$ is defined by
$$
\pi^{\star}(\cdot|s)=\underset{\pi(\cdot|s)}{\operatorname*{argmax}}V^{\pi}(s)=\underset{{\pi(\cdot|s)}}{\operatorname*{argmax}}\sum_{a}\pi(a|s)Q^{\pi}(s,a)
$$
and is always deterministic, you just choose the value-maximizing action:
$$
\pi^{\star}(a|s)=\mathbb{1}[a=\underset{a}{\operatorname*{argmax}}Q^{\star}(s,\tilde{a})].
$$
 The Markov property allows us to rewrite the value function in a recursive form called the [[Bellman equation]]:
	 $$\begin{align}
V^{\pi}(s)&=\sum_{a}\pi(a|s)\sum_{s'}T(s'|s,a)[R(s')+\gamma V^{\pi}(s')] \\
&=\mathbb{E}[R(s')+\gamma V^{\pi}(s')]
\end{align}$$
## State-action value
 the state-action value function equally follows a Bellman equation:
 $$Q^{\pi}(s,a)=\mathbb{E}[R(s')+\gamma Q^{\pi}(s',a')].$$
